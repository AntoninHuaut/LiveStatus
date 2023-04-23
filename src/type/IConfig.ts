export interface ITwitchConfig {
    clientId: string;
    clientSecret: string;
    checkIntervalMs: number;
}

export interface IDDataMessageLinkBtnConfig {
    offline: boolean;
    online: boolean;
}

export interface IDDataEventConfig {
    active: boolean;
}

export interface IDDataMessageConfig {
    active: boolean;
    linkBtn: IDDataMessageLinkBtnConfig;
}

export interface IDiscordDataConfig {
    event: IDDataEventConfig;
    message: IDDataMessageConfig;
}

export interface IDiscordData {
    discordGuildId: string;
    discordChannelId: string;
    discordRoleMentionId: string;
    twitchChannelName: string;
    config: IDiscordDataConfig;
}

export interface IDiscordConfig {
    botToken: string;
    discords: IDiscordData[];
}

export interface ILoggerConfig {
    debugLevel: boolean;
    logFile: string;
}

export interface IConfig {
    logger: ILoggerConfig;
    i18n: string;
    twitch: ITwitchConfig;
    discord: IDiscordConfig;
}
