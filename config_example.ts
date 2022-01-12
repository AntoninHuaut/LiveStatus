export default {
    twitchConfig: {
        clientId: "<Application Client Id>",
        clientSecret: "<Application Client Secret>",
        checkIntervalMs: 15000
    },
    discordConfig: {
        discordToken: "<discord bot token>",
        discords: [{
            discordGuildId: "<guildId>",
            discordChannelId: "<channelId>",
            discordRoleMentionId: "<roleId> (optional)",
            twitchChannelsName: "<twitchUserName>"
        }]
    }
}