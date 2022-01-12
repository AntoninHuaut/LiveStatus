import dayjs from "https://cdn.skypack.dev/dayjs@v1";
import relativeTime from "https://cdn.skypack.dev/dayjs@v1/plugin/relativeTime";
import fr from "https://cdn.skypack.dev/dayjs@v1/locale/fr";
import LiveModel from "../model/LiveModel.ts";
import { DiscordData } from "../model/Config.ts";
import TwitchCache from "../twitch/TwitchCache.ts";
import DiscordRequests from "./DiscordRequests.ts";
import Logger from "../utils/Logger.ts";

dayjs.extend(relativeTime);
dayjs.locale(fr);

import { DiscordIdsCache } from "./DiscordIdsCache.ts";

interface MessageImage {
    url: string;
    height: number;
    width: number;
}

interface MessageThumbnail {
    url: string;
    height: number;
    width: number;
}

interface MessageField {
    name: string;
    value: string;
    inline: boolean;
}

interface MessageEmbed {
    title: string;
    description?: string;
    url: string;
    type: string;
    color: number;
    image?: MessageImage;
    thumbnail?: MessageThumbnail;
    fields: MessageField[];
}

export interface MessageBody {
    content?: string;
    embeds: MessageEmbed[];
}

interface EventMetadata {
    location: string;
}

export interface EventBody {
    channel_id: null;
    name: string;
    entity_metadata: EventMetadata;
    scheduled_start_time?: Date;
    scheduled_end_time: Date;
    description: string;
    privacy_level: number;
    entity_type: number;
}

export default class DiscordClient {

    private static readonly COLOR_OFFLINE = 9807270;
    private static readonly COLOR_ONLINE = 10181046;
    private static readonly DELAY_BEFORE_OFFLINE: number = 2.5 * 60 * 1000; // In Ms, prevent stream crash

    private readonly discordRequests: DiscordRequests;
    private readonly discordData: DiscordData;
    private readonly checkIntervalMs: number;

    private eventId = '';
    private messageId = '';
    private lastOnlineTime = 0;

    public constructor(discordRequests: DiscordRequests, discordData: DiscordData, checkIntervalMs: number) {
        this.discordRequests = discordRequests;
        this.discordData = discordData;
        this.checkIntervalMs = checkIntervalMs;

        const idsCache = DiscordIdsCache.getInstance().get(discordData.discordChannelId, discordData.twitchChannelName);
        this.eventId = idsCache.eventId;
        this.messageId = idsCache.messageId;
    }

    public async tick() {
        Logger.debug(`DiscordClient (${this.discordData.twitchChannelName}) ticking`);

        const liveModel: LiveModel = TwitchCache.getInstance().get(this.discordData.twitchChannelName);
        if (!liveModel.isOnline) {
            await this.offlineTick(liveModel);
        } else {
            await this.onlineTick(liveModel);
        }
    }

    private async offlineTick(liveModel: LiveModel) {
        const lastOnlineDateWithDelay: Date = new Date(this.lastOnlineTime + DiscordClient.DELAY_BEFORE_OFFLINE);

        if (lastOnlineDateWithDelay < new Date()) {
            await Promise.all([
                this.sendOfflineMessage(liveModel),
                this.offlineEvent()
            ]);

            this.setMessageId('');
            this.setEventId('');
        }
    }

    private async onlineTick(liveModel: LiveModel) {
        this.lastOnlineTime = Date.now();
        await Promise.all([
            this.sendOnlineMessage(liveModel),
            this.onlineEvent(liveModel)
        ]);
    }

    private async onlineEvent(liveModel: LiveModel) {
        const eventPrivacyLevel = 2; // GUILD_ONLY
        const eventType = 3; // EXTERNAL

        try {
            const eventItem: EventBody = {
                channel_id: null,
                name: `${liveModel.userName} est en live`,
                entity_metadata: {
                    location: `https://twitch.tv/${liveModel.userName}`
                },
                scheduled_end_time: this.getFakedEventEndDate(),
                description: `:information_source: **${liveModel.streamTitle}**\n\n:video_game: **${liveModel.gameName}**`,
                privacy_level: eventPrivacyLevel,
                entity_type: eventType
            };

            if (!this.eventId) {
                eventItem.scheduled_start_time = this.getSoonDate();
                const jsonResponse = await this.discordRequests.createEvent(this.discordData.discordGuildId, eventItem);
                this.setEventId(jsonResponse.id);
            } else {
                const jsonResponse = await this.discordRequests.editEvent(this.discordData.discordGuildId, this.eventId, eventItem);
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
            await this.discordRequests.deleteEvent(this.discordData.discordGuildId, this.eventId);
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
        const bonusTime = Math.max(this.checkIntervalMs * 10, minTimeMin * 60 * 1000)
        return dayjs()
            .add(bonusTime, 'millisecond')
            .toDate();
    }

    private async sendOnlineMessage(liveModel: LiveModel) {
        const body: MessageBody = {
            "embeds": [this.getOnlineEmbed(liveModel)]
        }

        const roleId = this.discordData.discordRoleMentionId;
        if (!this.messageId && roleId?.trim()) {
            body.content = `<@&${roleId}>`;
        }

        try {
            if (!this.messageId) {
                const jsonResponse = await this.discordRequests.createMessage(this.discordData.discordChannelId, body);
                this.setMessageId(jsonResponse.id);
            } else {
                const jsonResponse = await this.discordRequests.editMessage(this.discordData.discordChannelId, this.messageId, body);
                if (jsonResponse.code && jsonResponse.code >= 10000) {
                    this.setMessageId('');
                }
            }
        } catch (err) {
            Logger.error(`[DiscordClients::sendOnlineMessage] ${this.discordData.twitchChannelName} error:\n${err.stack}`);
        }
    }

    private async sendOfflineMessage(liveModel: LiveModel) {
        if (!this.messageId) return;

        const body: MessageBody = {
            "embeds": [this.getOfflineEmbed(liveModel)]
        }

        try {
            await this.discordRequests.editMessage(this.discordData.discordChannelId, this.messageId, body);
        } catch (err) {
            Logger.error(`[DiscordClients::sendOfflineMessage] ${this.discordData.twitchChannelName} error:\n${err.stack}`);
        }
    }

    private getOfflineEmbed(liveModel: LiveModel): MessageEmbed {
        return this.cleanEmptyFieldsInEmbed({
            title: `:white_circle: ${liveModel.userName} était en live sur Twitch`,
            description: `**Le live est terminé**`,
            url: `https://twitch.tv/${liveModel.userName}`,
            type: "rich",
            color: DiscordClient.COLOR_OFFLINE,
            thumbnail: {
                url: liveModel.gameImageUrl,
                height: LiveModel.GAME_THUMBNAIL_HEIGHT,
                width: LiveModel.GAME_THUMBNAIL_WIDTH
            },
            fields: [
                {
                    name: "Titre",
                    value: liveModel.streamTitle,
                    inline: false
                },
                {
                    name: "Jeu",
                    value: liveModel.gameName,
                    inline: true
                }
            ]
        });
    }

    private getOnlineEmbed(liveModel: LiveModel): MessageEmbed {
        return this.cleanEmptyFieldsInEmbed({
            title: `:red_circle: ${liveModel.userName} est en live sur Twitch !`,
            url: `https://twitch.tv/${liveModel.userName}`,
            type: "rich",
            color: DiscordClient.COLOR_ONLINE,
            image: {
                url: liveModel.streamImageUrl,
                height: LiveModel.STREAM_IMAGE_HEIGHT,
                width: LiveModel.STREAM_IMAGE_WIDTH
            },
            thumbnail: {
                url: liveModel.gameImageUrl,
                height: LiveModel.GAME_THUMBNAIL_HEIGHT,
                width: LiveModel.GAME_THUMBNAIL_WIDTH
            },
            fields: [
                {
                    name: "Titre",
                    value: liveModel.streamTitle,
                    inline: false
                },
                {
                    name: "Jeu",
                    value: liveModel.gameName,
                    inline: false
                },
                {
                    name: "Statut",
                    value: `En live avec ${liveModel.viewerCount} viewers`,
                    inline: true
                },
                {
                    name: "Depuis",
                    value: this.formatDate(liveModel.startedAt),
                    inline: true
                }
            ]
        });
    }

    private cleanEmptyFieldsInEmbed(embed: MessageEmbed): MessageEmbed {
        if (!embed.thumbnail?.url) {
            delete embed.thumbnail;
        }
        if (!embed.image?.url) {
            delete embed.image;
        }
        embed.fields = embed.fields.filter(key => key.value)
        return embed;
    }

    private formatDate(date: Date): string {
        return dayjs(date).fromNow();
    }

    private setMessageId(messageId: string) {
        this.messageId = messageId;
        this.setCache();
    }

    private setEventId(eventId: string) {
        this.eventId = eventId;
        this.setCache();
    }

    private setCache() {
        DiscordIdsCache.getInstance().set(this.discordData.discordChannelId, this.discordData.twitchChannelName, { messageId: this.messageId, eventId: this.eventId });
    }
}