import DiscordClient from './discord/DiscordClient.ts';
import DiscordRequests from './discord/DiscordRequests.ts';
import { Config, DiscordConfig, DiscordData } from './model/Config.ts';
import TwitchRequest from './twitch/TwitchRequest.ts';
import TwitchRunnable from './twitch/TwitchRunnable.ts';
import * as Logger from './utils/Logger.ts';

const MIN_CHECK_INTERVAL = 1000;
let checkIntervalMs: number;
let timeoutId: number;
let discordClients: DiscordClient[];
let twitchRuns: TwitchRunnable[];

export function startGlobalRunnable(config: Config) {
    if (timeoutId) return;

    discordClients = [];
    twitchRuns = [];
    checkIntervalMs = Math.max(config.twitch.checkIntervalMs, MIN_CHECK_INTERVAL);

    createTwitchRunnable(config);
    createDiscordClients(config.discord);

    tick();
}

async function tick() {
    Logger.info(`GlobalRunnable (${discordClients.length} discordClients - ${twitchRuns.length} twitchRuns) ticking`);

    const promises: Promise<void>[] = [];
    twitchRuns.forEach((twitchRun: TwitchRunnable) => promises.push(twitchRun.tick()));
    await Promise.all(promises);

    promises.length = 0;
    discordClients.forEach((discordClient: DiscordClient) => promises.push(discordClient.tick()));
    await Promise.all(promises);

    timeoutId = setTimeout(() => tick(), checkIntervalMs);
}

function createTwitchRunnable(config: Config) {
    const twitchRequest: TwitchRequest = new TwitchRequest(config.twitch);

    const twitchChannelsName: Set<string> = new Set();
    config.discord.discords.map((discord: DiscordData) => twitchChannelsName.add(discord.twitchChannelName));

    twitchChannelsName.forEach((twitchUsername: string) => twitchRuns.push(new TwitchRunnable(twitchRequest, twitchUsername)));
}

function createDiscordClients(discordConfig: DiscordConfig) {
    const discordRequests: DiscordRequests = new DiscordRequests(discordConfig);
    discordConfig.discords.forEach((discord: DiscordData) => discordClients.push(new DiscordClient(discordRequests, discord, checkIntervalMs)));
}
