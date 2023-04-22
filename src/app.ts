import dayjs from 'dayjs';
import relativeTime from 'dayjs_relativeTime';
import { parse } from 'encoding/jsonc.ts';

import { startInteractionServer } from './interactionServer.ts';
import { initI18n } from './misc/i18n.ts';
import * as Logger from './misc/logger.ts';
import { createDiscordClient, IDiscordClient } from './service/discordClient.ts';
import { createTwitchRunnable, TwitchRunnable } from './service/twitchRunnable.ts';
import { IConfig, IDiscordData } from './type/IConfig.ts';

dayjs.extend(relativeTime);

export const config: IConfig = parse(Deno.readTextFileSync('./config.jsonc')) as unknown as IConfig;

let intervalId: number;

export const discordClients: IDiscordClient[] = [];
export const twitchRuns: TwitchRunnable[] = [];

export async function startRunnable() {
    if (intervalId) clearInterval(intervalId);

    const MIN_CHECK_INTERVAL_MS = 1000;
    const checkIntervalMs = Math.max(config.twitch.checkIntervalMs, MIN_CHECK_INTERVAL_MS);

    config.discord.discords.forEach((discord: IDiscordData) => {
        twitchRuns.push(createTwitchRunnable(discord.twitchChannelName));
        discordClients.push(createDiscordClient(discord, checkIntervalMs));
    });

    async function tick() {
        Logger.info(`GlobalRunnable (${discordClients.length} discordClients - ${twitchRuns.length} twitchRuns) ticking`);

        const promises: Promise<void>[] = [];
        twitchRuns.forEach((twitchRun: TwitchRunnable) => promises.push(twitchRun.tick()));
        await Promise.all(promises);

        promises.length = 0;
        discordClients.forEach((discordClient: IDiscordClient) => promises.push(discordClient.tick()));
        await Promise.all(promises);
    }

    intervalId = setInterval(() => tick(), checkIntervalMs);
    await tick();
}

await initI18n();
await startRunnable();
if (config.discord.interactionCommand.active) {
    await startInteractionServer();
}
