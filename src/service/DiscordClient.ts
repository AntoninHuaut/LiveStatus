import dayjs from 'dayjs';

import { createEvent, createMessage, deleteEvent, editEvent, editMessage } from '../api/discord_request.ts';
import { liveCommandName } from '../interactionServer.ts';
import * as cache from '../misc/cache.ts';
import { getI18n } from '../misc/i18nManager.ts';
import * as Logger from '../misc/logger.ts';
import CLive from '../type/CLive.ts';
import { DiscordData } from '../type/IConfig.ts';
import { EventBody, MessageBody, MessageEmbed } from '../type/IDiscord.ts';

export default class DiscordClient {
    private static readonly COLOR_OFFLINE = 9807270;
    private static readonly COLOR_ONLINE = 10181046;

    private readonly discordData: DiscordData;
    private readonly checkIntervalMs: number;

    private eventId = '';
    private messageId = '';
    private lastOnlineTime = 0;

    public constructor(discordData: DiscordData, checkIntervalMs: number) {
        this.discordData = discordData;
        this.checkIntervalMs = checkIntervalMs;

        const idsCache = cache.getDiscord(discordData.discordChannelId, discordData.twitchChannelName);
        this.eventId = idsCache.eventId;
        this.messageId = idsCache.messageId;
    }

    public getDiscordData(): DiscordData {
        return this.discordData;
    }

    public async tick() {
        Logger.debug(`DiscordClient (${this.discordData.twitchChannelName}) ticking`);

        const liveData: CLive = cache.getTwitch(this.discordData.twitchChannelName);
        if (!liveData.isOnline) {
            await this.offlineTick(liveData);
        } else {
            await this.onlineTick(liveData);
        }
    }

    private async offlineTick(liveData: CLive) {
        const lastOnlineDateWithDelay: Date = new Date(this.lastOnlineTime);

        if (lastOnlineDateWithDelay < new Date()) {
            const promises = [];
            if (this.discordData.config.message.active) {
                promises.push(this.sendOfflineMessage(liveData));
            }
            if (this.discordData.config.event.active) {
                promises.push(this.offlineEvent());
            }

            await Promise.all(promises);

            this.setMessageId('');
            this.setEventId('');
        }
    }

    private async onlineTick(liveData: CLive) {
        this.lastOnlineTime = Date.now();

        const promises = [];
        if (this.discordData.config.message.active) {
            promises.push(this.sendOnlineMessage(liveData));
        }
        if (this.discordData.config.event.active) {
            promises.push(this.onlineEvent(liveData));
        }

        await Promise.all(promises);
    }

    private async onlineEvent(liveData: CLive) {
        const eventPrivacyLevel = 2; // GUILD_ONLY
        const eventType = 3; // EXTERNAL
        const i18nOptions = this.getI18nOptions(liveData);

        try {
            const eventItem: EventBody = {
                channel_id: null,
                name: getI18n('discord.event.title', i18nOptions),
                entity_metadata: {
                    location: liveData.liveUrl,
                },
                scheduled_end_time: this.getFakedEventEndDate(),
                description: getI18n('discord.event.description', i18nOptions),
                privacy_level: eventPrivacyLevel,
                entity_type: eventType,
                image: liveData.streamImageUrlBase64,
            };

            if (!this.eventId) {
                eventItem.scheduled_start_time = this.getSoonDate();
                const jsonResponse = await createEvent(this.discordData.discordGuildId, eventItem);
                this.setEventId(jsonResponse.id);
            } else {
                const jsonResponse = await editEvent(this.discordData.discordGuildId, this.eventId, eventItem);
                if (jsonResponse.code && jsonResponse.code >= 10000) {
                    this.setEventId('');
                }
            }
        } catch (err) {
            Logger.error(`[DiscordClients::onlineEvent] ${this.discordData.twitchChannelName} error:\n${err.stack}`);
        }
    }

    private async offlineEvent() {
        if (!this.eventId) return;

        try {
            await deleteEvent(this.discordData.discordGuildId, this.eventId);
            this.setEventId('');
        } catch (err) {
            Logger.error(`[DiscordClients::offlineEvent] ${this.discordData.twitchChannelName} error:\n${err.stack}`);
        }
    }

    /**
     * Date cannot be schedule in the past
     * Delay to manage time synchronization problems
     */
    private getSoonDate(): Date {
        return dayjs().add(10, 'second').toDate();
    }

    /**
     * End date is required in the Discord API
     */
    private getFakedEventEndDate(): Date {
        const minTimeMin = 1;
        const bonusTime = Math.max(this.checkIntervalMs * 10, minTimeMin * 60 * 1000);
        return dayjs().add(bonusTime, 'millisecond').toDate();
    }

    private async sendOnlineMessage(liveData: CLive) {
        try {
            const body = this.getBodyMessage(liveData);
            const roleId = this.discordData.discordRoleMentionId;
            if (!this.messageId && roleId?.trim()) {
                body.content = `<@&${roleId}>`;
            }

            if (!this.messageId) {
                const jsonResponse = await createMessage(this.discordData.discordChannelId, body);
                this.setMessageId(jsonResponse.id);
            } else {
                const jsonResponse = await editMessage(this.discordData.discordChannelId, this.messageId, body);
                if (jsonResponse.code && jsonResponse.code >= 10000) {
                    this.setMessageId('');
                }
            }
        } catch (err) {
            Logger.error(`[DiscordClients::sendOnlineMessage] ${this.discordData.twitchChannelName} error:\n${err.stack}`);
        }
    }

    private async sendOfflineMessage(liveData: CLive) {
        if (!this.messageId) return;

        try {
            await editMessage(this.discordData.discordChannelId, this.messageId, this.getBodyMessage(liveData));
        } catch (err) {
            Logger.error(`[DiscordClients::sendOfflineMessage] ${this.discordData.twitchChannelName} error:\n${err.stack}`);
        }
    }

    public getBodyMessage(liveData: CLive): MessageBody {
        const embed = liveData.isOnline ? this.getOnlineEmbed(liveData) : this.getOfflineEmbed(liveData);
        const body: MessageBody = {
            embeds: [embed],
            components: [],
        };

        const i18nOptions = this.getI18nOptions(liveData);
        const btnI18n = getI18n(`discord.embed.${liveData.isOnline ? 'online' : 'offline'}.linkBtn`, i18nOptions);
        if (liveData.isOnline ? this.discordData.config.message.linkBtn.online : this.discordData.config.message.linkBtn.offline) {
            body.components = [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            url: liveData.liveUrl,
                            label: btnI18n,
                        },
                    ],
                },
            ];
        }

        return body;
    }

    private getOfflineEmbed(liveData: CLive): MessageEmbed {
        const i18nOptions = this.getI18nOptions(liveData);
        return this.cleanEmptyFieldsInEmbed({
            title: getI18n('discord.embed.offline.title', i18nOptions),
            description: getI18n('discord.embed.offline.description', i18nOptions),
            url: liveData.liveUrl,
            type: 'rich',
            color: DiscordClient.COLOR_OFFLINE,
            thumbnail: {
                url: liveData.gameImageUrl,
                height: CLive.GAME_THUMBNAIL_HEIGHT,
                width: CLive.GAME_THUMBNAIL_WIDTH,
            },
            fields: getI18n('discord.embed.offline.fields', i18nOptions),
            footer: {
                text: `/${liveCommandName}`,
                icon_url: 'https://i.imgur.com/Qo9ZWge.png',
            },
        });
    }

    private getOnlineEmbed(liveData: CLive): MessageEmbed {
        const i18nOptions = this.getI18nOptions(liveData);
        return this.cleanEmptyFieldsInEmbed({
            title: getI18n('discord.embed.online.title', i18nOptions),
            description: getI18n('discord.embed.online.description', i18nOptions),
            url: liveData.liveUrl,
            type: 'rich',
            color: DiscordClient.COLOR_ONLINE,
            image: {
                url: `${liveData.streamImageUrl}?noCache=${new Date().getTime()}`,
                height: CLive.STREAM_IMAGE_HEIGHT,
                width: CLive.STREAM_IMAGE_WIDTH,
            },
            thumbnail: {
                url: liveData.gameImageUrl,
                height: CLive.GAME_THUMBNAIL_HEIGHT,
                width: CLive.GAME_THUMBNAIL_WIDTH,
            },
            fields: getI18n('discord.embed.online.fields', i18nOptions),
            footer: {
                text: `/${liveCommandName}`,
                icon_url: 'https://i.imgur.com/Qo9ZWge.png',
            },
        });
    }

    private cleanEmptyFieldsInEmbed(embed: MessageEmbed): MessageEmbed {
        if (!embed.thumbnail?.url) {
            delete embed.thumbnail;
        }
        if (!embed.image?.url) {
            delete embed.image;
        }
        embed.fields = embed.fields.filter((key) => key.value);
        return embed;
    }

    private formatDate(date: Date): string {
        return dayjs(date).fromNow();
    }

    private getI18nOptions(liveData: CLive) {
        return {
            '%streamer%': liveData.userName,
            '%game%': liveData.gameName,
            '%title%': liveData.streamTitle,
            '%startDate%': this.formatDate(liveData.startedAt),
            '%viewer%': liveData.viewerCount,
        };
    }

    private setMessageId(messageId: string) {
        this.messageId = messageId;
        this.setCacheProxy();
    }

    private setEventId(eventId: string) {
        this.eventId = eventId;
        this.setCacheProxy();
    }

    private setCacheProxy() {
        cache.setDiscord(this.discordData.discordChannelId, this.discordData.twitchChannelName, {
            messageId: this.messageId,
            eventId: this.eventId,
        });
    }
}
