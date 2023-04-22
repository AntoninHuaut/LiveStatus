import { sign_detached_verify } from 'nacl/src/sign.ts';
import { Application } from 'oak/mod.ts';

import { createApplicationCommand, editApplicationCommand, getApplicationCommands } from './api/discord_request.ts';
import { config, discordClients } from './app.ts';
import * as cache from './misc/cache.ts';
import { getI18n } from './misc/i18nManager.ts';
import * as Logger from './misc/logger.ts';
import { IApplicationCommand, ICreateApplicationCommand, IEditApplicationCommand } from './type/ICommand.ts';

export const liveCommandName = 'live';
export let liveCommand: IApplicationCommand | null;

async function setupInteraction() {
    const applicationId = config.discord.interactionCommand.applicationId;

    const guildIdToStreamers = new Map<string, string[]>();
    config.discord.discords.forEach((discord) => {
        if (discord.discordGuildId && discord.twitchChannelName) {
            const streamers = guildIdToStreamers.get(discord.discordGuildId) ?? [];
            streamers.push(discord.twitchChannelName);
            guildIdToStreamers.set(discord.discordGuildId, streamers);
        }
    });

    for (const entry of guildIdToStreamers) {
        const guildId = entry[0];
        const streamers = entry[1];
        if (!guildId || streamers.length === 0) continue;

        try {
            const commands = await getApplicationCommands(applicationId, guildId);
            for (const command of commands) {
                if (command.name === liveCommandName) {
                    liveCommand = command;
                }
            }

            const partialLiveCommand: ICreateApplicationCommand = {
                name: liveCommandName,
                type: 1,
                description: getI18n('discord.liveCommand.description', {}),
                options: [
                    {
                        name: getI18n('discord.liveCommand.optionName', {}),
                        description: getI18n('discord.liveCommand.description', {}),
                        type: 3,
                        required: true,
                        choices: streamers.map((streamer) => ({ name: streamer, value: streamer })),
                    },
                ],
            };

            if (streamers.length === 1) {
                partialLiveCommand.options = [];
            }

            if (liveCommand) {
                const editPartialLiveCommand = { ...partialLiveCommand } as IEditApplicationCommand & { type?: number };
                delete editPartialLiveCommand.type;
                const result = await editApplicationCommand(editPartialLiveCommand as IEditApplicationCommand, applicationId, guildId, liveCommand.id);
                if (result.id) {
                    liveCommand = result;
                    Logger.debug('Edited live command');
                } else {
                    Logger.error(`Failed to edit live command (guildId = ${guildId}): \n${JSON.stringify(result)}`);
                }
            } else {
                const result = await createApplicationCommand(partialLiveCommand, applicationId, guildId);
                if (result.id) {
                    liveCommand = result;
                    Logger.debug('Created live command');
                } else {
                    Logger.error(`Failed to create live command (guildId = ${guildId}): \n${JSON.stringify(result)}`);
                }
            }
        } catch (error) {
            Logger.error(error);
        }
    }
}

export async function startInteractionServer() {
    await setupInteraction();

    return new Promise<void>((resolve) => {
        const app = new Application();
        const port = config.discord.interactionCommand.applicationEndpointPort;
        const publicKey = config.discord.interactionCommand.applicationPublicKey;

        const convert = (hex: string) => new Uint8Array(hex.match(/.{1,2}/g)!.map((val) => parseInt(val, 16)));
        app.use(async (ctx) => {
            try {
                const signature = ctx.request.headers.get('X-Signature-Ed25519') ?? '';
                const timestamp = ctx.request.headers.get('X-Signature-Timestamp') ?? '';

                const body = await ctx.request.body({ type: 'text' }).value;

                const isVerified = sign_detached_verify(new TextEncoder().encode(timestamp + body), convert(signature), convert(publicKey));

                if (!isVerified) {
                    ctx.response.status = 401;
                    ctx.response.body = 'Invalid request signature';
                    return;
                }

                const jsonBody = JSON.parse(body);
                if (jsonBody.type === 1) {
                    ctx.response.status = 200;
                    ctx.response.body = {
                        type: 1,
                    };
                } else if (jsonBody.type === 2) {
                    ctx.response.status = 200;
                    ctx.response.body = {
                        type: 4,
                        data: handleInteraction(jsonBody),
                    };
                }
            } catch (_) {
                ctx.response.status = 400;
            }
        });

        app.addEventListener('listen', () => {
            Logger.info(`Interaction server listening on :${port}`);
            resolve();
        });

        app.listen({ port: port });
    });
}

function handleInteraction(jsonBody: any) {
    try {
        const data = jsonBody.data;
        if (data.id === liveCommand?.id) {
            const guildId = jsonBody.guild_id;
            const options = data.options;
            let streamerName = '';
            if (options && options.length === 1) {
                streamerName = options[0].value;
            } else {
                const guild = config.discord.discords.find((discord) => discord.discordGuildId === guildId);
                if (guild) {
                    streamerName = guild.twitchChannelName;
                }
            }

            if (!streamerName) {
                return {
                    content: getI18n('discord.liveCommand.streamerNotFound', {}),
                    flags: 64,
                };
            }

            const discordClient = discordClients.find((client) => client.getDiscordData().twitchChannelName === streamerName);
            if (discordClient) {
                return { flags: 64, ...discordClient.getBodyMessage(cache.getTwitch(discordClient.getDiscordData().twitchChannelName)) };
            }
        }
    } catch (error) {
        Logger.error(error);
    }

    return {
        content: getI18n('discord.liveCommand.appError', {}),
        flags: 64,
    };
}
