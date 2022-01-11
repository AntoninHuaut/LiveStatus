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
    discordToken: string;
    discords: DiscordData[];
}

export interface Config {
    twitchConfig: TwitchConfig;
    discordConfig: DiscordConfig;
}