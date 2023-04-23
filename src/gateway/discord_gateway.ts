import { createApplicationCommand, editApplicationCommand, getApplicationCommands, respondToInteraction } from '../api/discord_request.ts';
import { config, discordClients } from '../app.ts';
import * as cache from '../misc/cache.ts';
import { getI18n } from '../misc/i18n.ts';
import * as Logger from '../misc/logger.ts';
import { IApplicationCommand, ICreateApplicationCommand, IEditApplicationCommand } from '../type/ICommand.ts';

const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg';

export function startDiscordGateway() {
    const ws = new WebSocket(DISCORD_GATEWAY_URL);
    let hearbeatInterval: number | null = null;

    const init = (heartbeat_interval: number) => {
        if (hearbeatInterval) return;

        hearbeatInterval = setInterval(() => {
            ws.send(JSON.stringify({ op: 1, d: null }));
        }, heartbeat_interval);

        ws.send(
            JSON.stringify({
                op: 2,
                d: {
                    token: config.discord.botToken,
                    properties: { os: Deno.build.os, browser: 'deno', device: 'deno' },
                    compress: false,
                },
            })
        );
    };
    const stopHearbeat = () => hearbeatInterval && clearInterval(hearbeatInterval);

    ws.onopen = () => Logger.info('Discord gateway opened');
    ws.onclose = () => {
        Logger.info('Discord gateway closed');
        stopHearbeat();
        startDiscordGateway();
    };
    ws.onerror = (err) => Logger.error(`[gateway::startDiscordGateway] ${err.toString()}`);
    ws.onmessage = async (msg) => {
        const json = JSON.parse(msg.data);
        if (!('op' in json)) return;

        if (json.op === 10) init(json.d.heartbeat_interval);
        else if (json.t === 'READY') {
            await setupCommands(json.d.application.id);
            Logger.info('Discord gateway ready to receive commands');
        } else if (json.t === 'INTERACTION_CREATE') {
            await handleInteraction(json.d);
        }
    };
}

export const liveCommandName = 'live';
const liveCommand: Record<string, IApplicationCommand | null> = {};

async function setupCommands(applicationId: string) {
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
                    liveCommand[guildId] = command;
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

            if (liveCommand[guildId]) {
                const editPartialLiveCommand = { ...partialLiveCommand } as IEditApplicationCommand & { type?: number };
                delete editPartialLiveCommand.type;
                const result = await editApplicationCommand(editPartialLiveCommand as IEditApplicationCommand, applicationId, guildId, liveCommand[guildId]!.id);
                if (result.id) {
                    liveCommand[guildId] = result;
                    Logger.debug('Edited live command');
                } else {
                    Logger.error(`Failed to edit live command (guildId = ${guildId}): \n${JSON.stringify(result)}`);
                }
            } else {
                const result = await createApplicationCommand(partialLiveCommand, applicationId, guildId);
                if (result.id) {
                    liveCommand[guildId] = result;
                    Logger.debug('Created live command');
                } else {
                    Logger.error(`Failed to create live command (guildId = ${guildId}): \n${JSON.stringify(result)}`);
                }
            }
        } catch (error) {
            Logger.error(`Failed to setup live command (guildId = ${guildId}): \n${error.stack}`);
        }
    }
}

function handleInteraction(jsonBody: any) {
    try {
        const data = jsonBody.data;
        const interactionId = jsonBody.id;
        const interactionToken = jsonBody.token;
        const guildId = jsonBody.guild_id;

        if (!interactionId || !interactionToken || data.id !== liveCommand[guildId]?.id) return;

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
            return respondToInteraction(interactionId, interactionToken, {
                type: 4,
                data: {
                    content: getI18n('discord.liveCommand.streamerNotFound', {}),
                    flags: 64,
                },
            });
        }

        const discordClient = discordClients.find((client) => client.getDiscordData().twitchChannelName === streamerName);
        if (!discordClient) {
            return respondToInteraction(interactionId, interactionToken, {
                type: 4,
                data: {
                    content: getI18n('discord.liveCommand.appError', {}),
                    flags: 64,
                },
            });
        }

        return respondToInteraction(interactionId, interactionToken, {
            type: 4,
            data: { flags: 64, ...discordClient.getBodyMessage(cache.getTwitch(discordClient.getDiscordData().twitchChannelName)) },
        });
    } catch (error) {
        Logger.error(`[gateway::handleInteraction] ${error.stack}`);
    }
}
