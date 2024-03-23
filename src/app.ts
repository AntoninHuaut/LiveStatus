import dayjs from 'dayjs';
import relativeTime from 'dayjs_relativeTime';
import { parse } from 'std/jsonc/mod.ts';

import { createDiscordClient, IDiscordClient } from './client/discord_client.ts';
import { createTwitchRunnable, TwitchRunnable } from './client/twitch_client.ts';
import { startDiscordGateway } from './discord_gateway.ts';
import { initI18n } from './misc/i18n.ts';
import * as Logger from './misc/logger.ts';
import { IConfig } from './type/IConfig.ts';

dayjs.extend(relativeTime);

export const config: IConfig = parse(Deno.readTextFileSync('./config.jsonc')) as unknown as IConfig;

export const discordClients: IDiscordClient[] = [];
export const twitchRuns: TwitchRunnable[] = [];

export async function startRunnable() {
    const MIN_CHECK_INTERVAL_MS = 1000;
    const checkIntervalMs = Math.max(config.twitch.checkIntervalMs, MIN_CHECK_INTERVAL_MS);
    const discords = config.discord.discords;

    [...new Set(discords.map((discord) => discord.twitchChannelName))].forEach((twitchChannelName) => twitchRuns.push(createTwitchRunnable(twitchChannelName)));
    discords.forEach((discord) => discordClients.push(createDiscordClient(discord, checkIntervalMs)));

    async function tick() {
        Logger.info(`GlobalRunnable (${discordClients.length} discordClients - ${twitchRuns.length} twitchRuns) ticking`);

        const promises: Promise<void>[] = [];
        twitchRuns.forEach((twitchRun) => promises.push(twitchRun.tick()));
        await Promise.all(promises);

        promises.length = 0;
        discordClients.forEach((discordClient) => promises.push(discordClient.tick()));
        await Promise.all(promises);
    }

    setInterval(() => tick(), checkIntervalMs);
    await tick();
}

await initI18n();
await startRunnable();
startDiscordGateway();
