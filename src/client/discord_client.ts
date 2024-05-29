import dayjs from 'dayjs';

import { createEvent, createMessage, deleteEvent, editEvent, editMessage } from '../api/discord_request.ts';
import { liveCommandName } from '../discord_gateway.ts';
import * as cache from '../misc/cache.ts';
import { getI18n } from '../misc/i18n.ts';
import * as Logger from '../misc/logger.ts';
import { IDiscordData } from '../type/IConfig.ts';
import { IEventBody, IMessageBody, IMessageEmbed } from '../type/IDiscord.ts';
import {
    GAME_THUMBNAIL_HEIGHT,
    GAME_THUMBNAIL_WIDTH,
    ILiveData,
    STREAM_IMAGE_HEIGHT,
    STREAM_IMAGE_WIDTH,
} from '../type/ILiveData.ts';

const COLOR_OFFLINE = 9807270;
const COLOR_ONLINE = 10181046;

export interface IDiscordClient {
    getDiscordData: () => IDiscordData;
    tick: () => Promise<void>;
    getBodyMessage: (liveData: ILiveData) => IMessageBody;
}

export function createDiscordClient(discordData: IDiscordData, checkIntervalMs: number): IDiscordClient {
    let { eventId, messageId } = cache.getDiscord(discordData.discordChannelId, discordData.twitchChannelName);
    let lastOnlineTime = 0;

    const tick = () => {
        Logger.debug(`DiscordClient (${discordData.twitchChannelName}) ticking`);
        const liveData = cache.getTwitch(discordData.twitchChannelName);
        return liveData.isOnline() ? onlineTick(liveData) : offlineTick(liveData);
    };

    const offlineTick = async (liveData: ILiveData) => {
        const lastOnlineDateWithDelay: Date = new Date(lastOnlineTime);

        if (lastOnlineDateWithDelay < new Date()) {
            const promises = [];
            if (discordData.config.message.active) promises.push(sendOfflineMessage(liveData));
            if (discordData.config.event.active) promises.push(offlineEvent());
            await Promise.all(promises);

            setMessageId('');
            setEventId('');
        }
    };

    const onlineTick = async (liveData: ILiveData) => {
        lastOnlineTime = Date.now();

        const promises = [];
        if (discordData.config.message.active) promises.push(sendOnlineMessage(liveData));
        if (discordData.config.event.active) promises.push(onlineEvent(liveData));
        await Promise.all(promises);
    };

    const onlineEvent = async (liveData: ILiveData) => {
        const eventPrivacyLevel = 2; // GUILD_ONLY
        const eventType = 3; // EXTERNAL
        const i18nOptions = getI18nOptions(liveData);

        try {
            const eventItem: IEventBody = {
                channel_id: null,
                name: getI18n('discord.event.title', i18nOptions),
                entity_metadata: {
                    location: liveData.liveUrl(),
                },
                scheduled_end_time: getFakedEventEndDate(),
                description: getI18n('discord.event.description', i18nOptions),
                privacy_level: eventPrivacyLevel,
                entity_type: eventType,
                image: liveData.streamImageUrlBase64(),
            };

            if (!eventId) {
                eventItem.scheduled_start_time = getSoonDate();
                const jsonResponse = await createEvent(discordData.discordGuildId, eventItem);
                setEventId(jsonResponse.id);
            } else {
                const jsonResponse = await editEvent(discordData.discordGuildId, eventId, eventItem);
                if (jsonResponse.code && jsonResponse.code >= 10000) {
                    setEventId('');
                }
            }
        } catch (err) {
            Logger.error(`[DiscordClients::onlineEvent] ${discordData.twitchChannelName} error:\n${err.stack}`);
        }
    };

    const offlineEvent = async () => {
        if (!eventId) return;

        try {
            await deleteEvent(discordData.discordGuildId, eventId);
            setEventId('');
        } catch (err) {
            Logger.error(`[DiscordClients::offlineEvent] ${discordData.twitchChannelName} error:\n${err.stack}`);
        }
    };

    // Date cannot be schedule in the past, delay to manage time synchronization problems
    const getSoonDate = () => dayjs().add(10, 'second').toDate();

    // End date is required in the Discord API
    const getFakedEventEndDate = () => {
        const minTimeMin = 1;
        const bonusTime = Math.max(checkIntervalMs * 10, minTimeMin * 60 * 1000);
        return dayjs().add(bonusTime, 'millisecond').toDate();
    };

    const sendOnlineMessage = async (liveData: ILiveData) => {
        try {
            const body = getBodyMessage(liveData);
            const roleId = discordData.discordRoleMentionId;
            if (!messageId && roleId?.trim()) {
                if (roleId === discordData.discordGuildId) {
                    body.content = '@everyone';
                } else {
                    body.content = `<@&${roleId}>`;
                }
            }

            if (!messageId) {
                const jsonResponse = await createMessage(discordData.discordChannelId, body);
                setMessageId(jsonResponse.id);
            } else {
                const jsonResponse = await editMessage(discordData.discordChannelId, messageId, body);
                if (jsonResponse.code && jsonResponse.code >= 10000) {
                    setMessageId('');
                }
            }
        } catch (err) {
            Logger.error(`[DiscordClients::sendOnlineMessage] ${discordData.twitchChannelName} error:\n${err.stack}`);
        }
    };

    const sendOfflineMessage = async (liveData: ILiveData) => {
        if (!messageId) return;

        try {
            await editMessage(discordData.discordChannelId, messageId, getBodyMessage(liveData));
        } catch (err) {
            Logger.error(`[DiscordClients::sendOfflineMessage] ${discordData.twitchChannelName} error:\n${err.stack}`);
        }
    };

    const getBodyMessage = (liveData: ILiveData): IMessageBody => {
        const embed = liveData.isOnline() ? getOnlineEmbed(liveData) : getOfflineEmbed(liveData);
        const body: IMessageBody = {
            embeds: [embed],
            components: [],
        };

        const i18nOptions = getI18nOptions(liveData);
        const btnI18n = getI18n(`discord.embed.${liveData.isOnline() ? 'online' : 'offline'}.linkBtn`, i18nOptions);
        if (liveData.isOnline() ? discordData.config.message.linkBtn.online : discordData.config.message.linkBtn.offline) {
            body.components = [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            url: liveData.liveUrl(),
                            label: btnI18n,
                        },
                    ],
                },
            ];
        }

        return body;
    };

    const getOfflineEmbed = (liveData: ILiveData): IMessageEmbed => {
        const i18nOptions = getI18nOptions(liveData);
        return cleanEmptyFieldsInEmbed({
            title: getI18n('discord.embed.offline.title', i18nOptions),
            description: getI18n('discord.embed.offline.description', i18nOptions),
            url: liveData.liveUrl(),
            type: 'rich',
            color: COLOR_OFFLINE,
            thumbnail: {
                url: liveData.gameImageUrl(),
                height: GAME_THUMBNAIL_HEIGHT,
                width: GAME_THUMBNAIL_WIDTH,
            },
            fields: getI18n('discord.embed.offline.fields', i18nOptions),
            footer: {
                text: `/${liveCommandName}`,
                icon_url: 'https://i.imgur.com/Qo9ZWge.png',
            },
        });
    };

    const getOnlineEmbed = (liveData: ILiveData): IMessageEmbed => {
        const i18nOptions = getI18nOptions(liveData);
        return cleanEmptyFieldsInEmbed({
            title: getI18n('discord.embed.online.title', i18nOptions),
            description: getI18n('discord.embed.online.description', i18nOptions),
            url: liveData.liveUrl(),
            type: 'rich',
            color: COLOR_ONLINE,
            image: {
                url: `${liveData.streamImageUrl()}?noCache=${new Date().getTime()}`,
                height: STREAM_IMAGE_HEIGHT,
                width: STREAM_IMAGE_WIDTH,
            },
            thumbnail: {
                url: liveData.gameImageUrl(),
                height: GAME_THUMBNAIL_HEIGHT,
                width: GAME_THUMBNAIL_WIDTH,
            },
            fields: getI18n('discord.embed.online.fields', i18nOptions),
            footer: {
                text: `/${liveCommandName}`,
                icon_url: 'https://i.imgur.com/Qo9ZWge.png',
            },
        });
    };

    const cleanEmptyFieldsInEmbed = (embed: IMessageEmbed): IMessageEmbed => {
        if (!embed.thumbnail?.url) delete embed.thumbnail;
        if (!embed.image?.url) delete embed.image;
        embed.fields = embed.fields.filter((key) => key.value);
        return embed;
    };

    const formatDate = (date: Date) => dayjs(date).fromNow();

    const getI18nOptions = (liveData: ILiveData) => ({
        '%streamer%': liveData.userName(),
        '%game%': liveData.gameName(),
        '%title%': liveData.streamTitle(),
        '%startDate%': formatDate(liveData.startedAt()),
        '%viewer%': liveData.viewerCount(),
    });

    const setMessageId = (_messageId: string) => {
        messageId = _messageId;
        setCacheProxy();
    };

    const setEventId = (_eventId: string) => {
        eventId = _eventId;
        setCacheProxy();
    };

    const setCacheProxy = () => {
        cache.setDiscord(discordData.discordChannelId, discordData.twitchChannelName, {
            messageId: messageId,
            eventId: eventId,
        });
    };

    return {
        getDiscordData: () => discordData,
        tick,
        getBodyMessage,
    };
}
