export namespace ConfigModule {

    export interface TwitchConfig {
        clientId: string;
        clientSecret: string;
        checkIntervalMs: number;
    }

    export interface Discord {
        discordChannelId: string;
        discordRoleMentionId: string;
        twitchChannelName: string;
    }

    export interface DiscordConfig {
        discordToken: string;
        discords: Discord[];
    }

    export interface Config {
        twitchConfig: TwitchConfig;
        discordConfig: DiscordConfig;
    }
}