import { config } from '../app.ts';
import { IApplicationCommand, ICreateApplicationCommand, IEditApplicationCommand } from '../type/ICommand.ts';
import { IEventBody, IMessageBody } from '../type/IDiscord.ts';
import { fetchURL, HttpMethod } from './request.ts';

export function createMessage(channelId: string, body: IMessageBody) {
    return fetchDiscord(`channels/${channelId}/messages`, HttpMethod.POST, body).then((res) => res.json());
}

export function editMessage(channelId: string, messageId: string, body: IMessageBody) {
    return fetchDiscord(`channels/${channelId}/messages/${messageId}`, HttpMethod.PATCH, body).then((res) => res.json());
}

export function createEvent(guildId: string, body: IEventBody) {
    return fetchDiscord(`guilds/${guildId}/scheduled-events`, HttpMethod.POST, body).then((res) => res.json());
}

export function editEvent(guildId: string, eventId: string, body: IEventBody) {
    return fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.PATCH, body).then((res) => res.json());
}

export function deleteEvent(guildId: string, eventId: string) {
    return fetchDiscord(`guilds/${guildId}/scheduled-events/${eventId}`, HttpMethod.DELETE);
}

export async function getApplicationCommands(applicationId: string, guildId: string) {
    return (await fetchDiscord(`applications/${applicationId}/guilds/${guildId}/commands`, HttpMethod.GET).then((res) => res.json())) as IApplicationCommand[];
}

export async function createApplicationCommand(command: ICreateApplicationCommand, applicationId: string, guildId: string) {
    return (await fetchDiscord(`applications/${applicationId}/guilds/${guildId}/commands`, HttpMethod.POST, command).then((res) => res.json())) as IApplicationCommand;
}

export async function editApplicationCommand(command: IEditApplicationCommand, applicationId: string, guildId: string, commandId: string) {
    return (await fetchDiscord(`applications/${applicationId}/guilds/${guildId}/commands/${commandId}`, HttpMethod.PATCH, command).then((res) =>
        res.json()
    )) as IApplicationCommand;
}

export async function respondToInteraction(interactionId: string, interactionToken: string, body: { type: number; data: Record<string, any> }) {
    return (await fetchDiscord(`interactions/${interactionId}/${interactionToken}/callback`, HttpMethod.POST, body)).status === 204;
}

function fetchDiscord(apiPath: string, httpMethod: HttpMethod, body?: Record<string, any>) {
    const headers: Headers = new Headers({
        Authorization: 'Bot ' + config.discord.botToken,
        'Content-Type': 'application/json',
    });
    return fetchURL(`https://discord.com/api/${apiPath}`, httpMethod, headers, body);
}
