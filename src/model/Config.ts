export interface TwitchConfig {
    clientId: string;
    clientSecret: string;
    checkIntervalMs: number;
}

export interface DiscordData {
    discordGuildId: string;
    discordChannelId: string;
    discordRoleMentionId: string;
    twitchChannelName: string;
}

export interface DiscordConfig {
    botToken: string;
    discords: DiscordData[];
}

export interface LoggerConfig {
    debugLevel: boolean;
    logFile: string;
}

export interface Config {
    logger: LoggerConfig;
    twitch: TwitchConfig;
    discord: DiscordConfig;
}