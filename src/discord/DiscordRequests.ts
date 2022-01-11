import { DiscordConfig } from "../model/Config.ts";
import { HttpMethod, fetchURL } from "../model/Requests.ts";
import { EventBody, MessageBody } from "./DiscordClient.ts";

export default class DiscordRequests {

    private readonly discordConfig: DiscordConfig;

    public constructor(discordConfig: DiscordConfig) {
        this.discordConfig = discordConfig;
    }

    public async createMessage(channelId: string, body: MessageBody) {
        return await this.fetchDiscord(`channels/${channelId}/messages`, HttpMethod.POST, body).then(res => res.json());
    }

    public async editMessage(channelId: string, messageId: string, body: MessageBody) {
        return await this.fetchDiscord(`channels/${channelId}/messages/${messageId}`, HttpMethod.PATCH, body).then(res => res.json());
    }

    public async createEvent(guildId: string, body: EventBody) {
        return await this.fetchDiscord(`guilds/${guildId}/scheduled-events`, HttpMethod.POST, body).then(res => res.json());
    }

    public async editEvent(guildId: string, eventId: string, body: EventBody) {
        return await this.fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.PATCH, body).then(res => res.json());
    }

    public async deleteEvent(guildId: string, eventId: string) {
        return await this.fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.DELETE).then(res => res.json());
    }

    private async fetchDiscord(apiPath: string, httpMethod: HttpMethod, body?: any) {
        const headers: Headers = new Headers({
            'Authorization': 'Bot ' + this.discordConfig.discordToken,
            'Content-Type': 'application/json'
        });
        return await fetchURL(`https://discord.com/api/${apiPath}`, httpMethod, headers, body);
    }
}