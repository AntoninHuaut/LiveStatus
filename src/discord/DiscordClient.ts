import dayjs from "https://cdn.skypack.dev/dayjs";
import relativeTime from "https://cdn.skypack.dev/dayjs/plugin/relativeTime";
import fr from "https://cdn.skypack.dev/dayjs/locale/fr";
import LiveModel from "../model/LiveModel.ts";
import { DiscordData } from "../model/Config.ts";
import TwitchCache from "../twitch/TwitchCache.ts";
import DiscordRequests from "./DiscordRequests.ts";
import Logger from "../utils/Logger.ts";

dayjs.extend(relativeTime);
dayjs.locale(fr);

import MessageIdCache from "./MessageIdCache.ts";

interface Image {
    url: string;
    height: number;
    width: number;
}

interface Thumbnail {
    url: string;
    height: number;
    width: number;
}

interface Field {
    name: string;
    value: string;
    inline: boolean;
}

interface Embed {
    title: string;
    description?: string;
    url: string;
    type: string;
    color: number;
    image?: Image;
    thumbnail: Thumbnail;
    fields: Field[];
}

interface DiscordBody {
    content?: string;
    embeds: Embed[]
}

export default class DiscordClient {

    private static readonly COLOR_OFFLINE = 9807270;
    private static readonly COLOR_ONLINE = 10181046;
    private static readonly DELAY_BEFORE_OFFLINE: number = 2.5 * 60 * 1000; // In Ms, prevent stream crash

    private readonly discordRequests: DiscordRequests;
    private readonly discordData: DiscordData;

    private messageId = '';
    private lastOnlineTime = 0;

    public constructor(discordRequests: DiscordRequests, discordData: DiscordData) {
        this.discordRequests = discordRequests;
        this.discordData = discordData;
        this.messageId = MessageIdCache.getInstance().get(discordData.discordChannelId, discordData.twitchChannelName);
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
            await this.sendOfflineMessage(liveModel);
            this.setMessageId('');
        }
    }

    private async onlineTick(liveModel: LiveModel) {
        this.lastOnlineTime = Date.now();
        await this.sendOnlineMessage(liveModel);
    }

    private async sendOfflineMessage(liveModel: LiveModel) {
        if (!this.messageId) return;

        const body: DiscordBody = {
            "embeds": [this.getOfflineEmbed(liveModel)]
        }

        await this.discordRequests.editMessage(this.discordData.discordChannelId, this.messageId, body);
    }

    private async sendOnlineMessage(liveModel: LiveModel) {
        const body: DiscordBody = {
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
                await this.discordRequests.editMessage(this.discordData.discordChannelId, this.messageId, body);
            }
        } catch (err) {
            Logger.error(`DiscordClients ${this.discordData.twitchChannelName} error:\n${err}`);
        }
    }

    private getOfflineEmbed(liveModel: LiveModel): Embed {
        return {
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
        };
    }

    private getOnlineEmbed(liveModel: LiveModel): Embed {
        return {
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
        };
    }

    private formatDate(date: Date): string {
        return dayjs(date).fromNow();
    }

    private setMessageId(messageId: string) {
        this.messageId = messageId;
        MessageIdCache.getInstance().set(this.discordData.discordChannelId, this.discordData.twitchChannelName, messageId);
    }
}