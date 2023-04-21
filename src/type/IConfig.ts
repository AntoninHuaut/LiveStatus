export interface TwitchConfig {
    clientId: string;
    clientSecret: string;
    checkIntervalMs: number;
}

export interface DDataMessageLinkBtnConfig {
    offline: boolean;
    online: boolean;
}

export interface DDataEventConfig {
    active: boolean;
}

export interface DDataMessageConfig {
    active: boolean;
    linkBtn: DDataMessageLinkBtnConfig;
}

export interface DiscordDataConfig {
    event: DDataEventConfig;
    message: DDataMessageConfig;
}

export interface DiscordData {
    discordGuildId: string;
    discordChannelId: string;
    discordRoleMentionId: string;
    twitchChannelName: string;
    config: DiscordDataConfig;
}

export interface DiscordInteractionCommand {
    active: boolean;
    applicationId: string;
    applicationPublicKey: string;
    applicationEndpointPort: number;
}

export interface DiscordConfig {
    botToken: string;
    interactionCommand: DiscordInteractionCommand;
    discords: DiscordData[];
}

export interface LoggerConfig {
    debugLevel: boolean;
    logFile: string;
}

export interface IConfig {
    logger: LoggerConfig;
    i18n: string;
    twitch: TwitchConfig;
    discord: DiscordConfig;
}
