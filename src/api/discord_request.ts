import { fetchURL, HttpMethod } from './request.ts';
import { EventBody, MessageBody } from '../type/IDiscord.ts';
import { config } from "../app.ts";

export function createMessage(channelId: string, body: MessageBody) {
    return fetchDiscord(`channels/${channelId}/messages`, HttpMethod.POST, body).then((res) => res.json());
}

export function editMessage(channelId: string, messageId: string, body: MessageBody) {
    return fetchDiscord(`channels/${channelId}/messages/${messageId}`, HttpMethod.PATCH, body).then((res) => res.json());
}

export function createEvent(guildId: string, body: EventBody) {
    return fetchDiscord(`guilds/${guildId}/scheduled-events`, HttpMethod.POST, body).then((res) => res.json());
}

export function editEvent(guildId: string, eventId: string, body: EventBody) {
    return fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.PATCH, body).then((res) => res.json());
}

export function deleteEvent(guildId: string, eventId: string) {
    return fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.DELETE);
}

function fetchDiscord(apiPath: string, httpMethod: HttpMethod, body?: Record<string, any>) {
    const headers: Headers = new Headers({
        Authorization: 'Bot ' + config.discord.botToken,
        'Content-Type': 'application/json',
    });
    return fetchURL(`https://discord.com/api/${apiPath}`, httpMethod, headers, body);
}
