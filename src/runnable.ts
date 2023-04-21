import { config } from './app.ts';
import DiscordClient from './service/DiscordClient.ts';
import TwitchRunnable from './service/TwitchRunnable.ts';
import { DiscordData } from './type/IConfig.ts';
import * as Logger from './util/Logger.ts';

const MIN_CHECK_INTERVAL = 1000;
let checkIntervalMs: number;
let timeoutId: number;
let discordClients: DiscordClient[];
let twitchRuns: TwitchRunnable[];

export async function startRunnable() {
    if (timeoutId) return;

    discordClients = [];
    twitchRuns = [];
    checkIntervalMs = Math.max(config.twitch.checkIntervalMs, MIN_CHECK_INTERVAL);

    createTwitchRunnable();
    createDiscordClients();

    await tick();
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

function createTwitchRunnable() {
    const twitchChannelsName: Set<string> = new Set();
    config.discord.discords.map((discord: DiscordData) => twitchChannelsName.add(discord.twitchChannelName));

    twitchChannelsName.forEach((twitchUsername: string) => twitchRuns.push(new TwitchRunnable(twitchUsername)));
}

function createDiscordClients() {
    config.discord.discords.forEach((discord: DiscordData) => discordClients.push(new DiscordClient(discord, checkIntervalMs)));
}
