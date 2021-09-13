import TwitchRunnable from "./twitch/TwitchRunnable.ts";
import {ConfigModule} from "./model/Config.ts";
import TwitchRequest from "./twitch/TwitchRequest.ts";
import DiscordRequests from "./discord/DiscordRequests.ts";
import DiscordClient from "./discord/DiscordClient.ts";
import Logger from "./utils/Logger.ts";
import Config = ConfigModule.Config;
import DiscordConfig = ConfigModule.DiscordConfig;
import Discord = ConfigModule.Discord;

export default class GlobalRunnable {

    private static MIN_CHECK_INTERVAL: number = 1000;

    private readonly checkIntervalMs: number;

    private readonly discordClients: DiscordClient[];
    private readonly twitchRuns: TwitchRunnable[];

    public constructor(config: Config) {
        this.discordClients = [];
        this.twitchRuns = [];
        this.checkIntervalMs = Math.max(config.twitchConfig.checkIntervalMs, GlobalRunnable.MIN_CHECK_INTERVAL);

        this.createTwitchRunnable(config);
        this.createDiscordClients(config.discordConfig);

        this.tick();
    }

    private async tick() {
        Logger.info(`GlobalRunnable (${this.discordClients.length} discordClients - ${this.twitchRuns.length} twitchRuns) ticking`);

        const promises: Promise<any>[] = [];
        this.twitchRuns.forEach((twitchRun: TwitchRunnable) => promises.push(twitchRun.tick()));
        await Promise.all(promises);

        promises.length = 0;
        this.discordClients.forEach((discordClient: DiscordClient) => promises.push(discordClient.tick()));
        await Promise.all(promises);

        window.setTimeout(() => this.tick(), this.checkIntervalMs);
    }

    private createTwitchRunnable(config: Config) {
        const twitchRequest: TwitchRequest = new TwitchRequest(config.twitchConfig);

        const twitchChannelsName: Set<string> = new Set();
        config.discordConfig.discords.map((discord: Discord) => twitchChannelsName.add(discord.twitchChannelName));

        twitchChannelsName.forEach((twitchUsername: string) => this.twitchRuns.push(new TwitchRunnable(twitchRequest, twitchUsername)));
    }

    private createDiscordClients(discordConfig: DiscordConfig) {
        const discordRequests: DiscordRequests = new DiscordRequests(discordConfig);
        discordConfig.discords.forEach((discord: Discord) => this.discordClients.push(new DiscordClient(discordRequests, discord)));
    }
}