export default {
    logger: {
        debugLevel: false,
        logFile: "app.log" // Null to disable
    },
    twitch: {
        clientId: "<Application Client Id>",
        clientSecret: "<Application Client Secret>",
        checkIntervalMs: 15000
    },
    discord: {
        botToken: "<discord bot token>",
        discords: [{
            discordGuildId: "<guildId>",
            discordChannelId: "<channelId>",
            discordRoleMentionId: "<roleId> (optional)",
            twitchChannelName: "<twitchUserName>"
        }]
    }
}