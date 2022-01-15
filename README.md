# LiveStatus

Tool for Twitch stream alert on Discord\
Built with [Deno](https://deno.land)

## Preview

![Preview](https://i.imgur.com/lSUs1b9.png)

## Requirements

Install [Deno](https://deno.land/#installation) if you don't have it yet\
Otherwise check that you are up to date with

```console
deno upgrade
```

## Getting started

### Clone the repository

```console
git clone https://github.com/AntoninHuaut/LiveStatus
cd LiveStatus/
```

### Configure the application

Clone the example config file

```console
cp config_example.ts config.ts
```

Open the config.ts file with your favorite text editor

```typescript
{
    logger: {
        debugLevel: false, // Log messages with DEBUG level                     
        logFile: "app.log" // Log file name
    },
    i18n: "en", // Messages language (resource/i18n/messages_${language}.json).
                // The language must exist in this list: https://github.com/iamkun/dayjs/tree/dev/src/locale
    twitch: {
        // Go to https://dev.twitch.tv/console/apps and create an application (You can put http://localhost/ in OAuth redirection URL)
        clientId: "<Application Client Id>",
        clientSecret: "<Application Client Secret>",
        checkIntervalMs: 15000 // Check the Twitch API every X milliseconds, too low a value may result in the app being banned.
    },
    discord: {
        // Go to https://discord.com/developers/applications, create a bot application
        // Add your bot on your server: https://discord.com/api/oauth2/authorize?client_id=<Insert your bot Application ID here>&permissions=8590445568&scope=bot 
        // Make sure your robot has the permissions to publish in the channel
        botToken: "<discord bot token>",
        // List of discord, mMake sur your discord account is in developer mode to easily copy guildId/channelId/roleId (Settings -> Advanced -> Developer mode)
        discords: [{
            discordGuildId: "<guildId>",
            discordChannelId: "<channelId>",
            discordRoleMentionId: "<roleId>", // Role to tag when the stream is live, empty to disable
            twitchChannelName: "<twitchUserName>",
            config: {
                event: {
                    active: true
                },
                message: {
                    active: true,
                    linkBtn: {
                        online: true,
                        offline: true
                    }
                }
            }
        }]
    }
}
```

### Run the application

```console
deno run --allow-net --allow-read=. --allow-write=. ./src/app.ts
```

> Note: you can run the application with pm2 if you use it

```console
pm2 start ./src/app.ts --name LiveStatus --interpreter="deno" --interpreter-args="run --allow-net --allow-read=. --allow-write=."
```
