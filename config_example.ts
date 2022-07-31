export default {
    logger: {
        debugLevel: false,
        logFile: 'app.log', // Empty to disable
    },
    i18n: 'en',
    twitch: {
        clientId: '<Application Client Id>',
        clientSecret: '<Application Client Secret>',
        checkIntervalMs: 15000,
    },
    discord: {
        botToken: '<discord bot token>',
        discords: [
            {
                discordGuildId: '<guildId>',
                discordChannelId: '<channelId>',
                discordRoleMentionId: '<roleId>', // Empty to disable
                twitchChannelName: '<twitchUserName>',
                config: {
                    event: {
                        active: true,
                    },
                    message: {
                        active: true,
                        linkBtn: {
                            online: true,
                            offline: true,
                        },
                    },
                },
            },
        ],
    },
};
