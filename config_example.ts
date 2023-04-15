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
        interactionCommand: {
            active: false,
            applicationId: '', // On Discord Developer Portal (Your application)
            applicationPublicKey: '', // On Discord Developer Portal (Your application)
            applicationEndpointPort: 4100, // Need to be set on Discord Developer Portal (Your application)
        },
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
