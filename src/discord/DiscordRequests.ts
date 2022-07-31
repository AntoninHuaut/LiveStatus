import { DiscordConfig } from '../model/Config.ts';
import { fetchURL, HttpMethod } from '../model/Requests.ts';
import { EventBody, MessageBody } from '../model/DiscordModel.ts';

export default class DiscordRequests {
    private readonly discordConfig: DiscordConfig;

    public constructor(discordConfig: DiscordConfig) {
        this.discordConfig = discordConfig;
    }

    public createMessage(channelId: string, body: MessageBody) {
        return this.fetchDiscord(`channels/${channelId}/messages`, HttpMethod.POST, body).then((res) => res.json());
    }

    public editMessage(channelId: string, messageId: string, body: MessageBody) {
        return this.fetchDiscord(`channels/${channelId}/messages/${messageId}`, HttpMethod.PATCH, body).then((res) => res.json());
    }

    public createEvent(guildId: string, body: EventBody) {
        return this.fetchDiscord(`guilds/${guildId}/scheduled-events`, HttpMethod.POST, body).then((res) => res.json());
    }

    public editEvent(guildId: string, eventId: string, body: EventBody) {
        return this.fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.PATCH, body).then((res) => res.json());
    }

    public deleteEvent(guildId: string, eventId: string) {
        return this.fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.DELETE);
    }

    private fetchDiscord(apiPath: string, httpMethod: HttpMethod, body?: Record<string, any>) {
        const headers: Headers = new Headers({
            Authorization: 'Bot ' + this.discordConfig.botToken,
            'Content-Type': 'application/json',
        });
        return fetchURL(`https://discord.com/api/${apiPath}`, httpMethod, headers, body);
    }
}
