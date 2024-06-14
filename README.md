# LiveStatus

Tool for Twitch stream alert on Discord\
Built with [Go](https://go.dev/)

## Preview

![Preview](https://i.imgur.com/ReTP7XL.png)

## Getting started

### Configure and run the application

Get the `config_example.yaml` and `docker-compose.yml` files\
Copie the example config file to `config.yaml`

```console
cp config_example.yaml config.yaml
```

Open the config.yaml file with your favorite text editor and fill it in

```yaml
twitch:
  # Go to https://dev.twitch.tv/console/apps and create an application (You can put http://localhost/ in OAuth redirection URL) to get the clientId / clientSecret
  clientId: ""
  clientSecret: ""
  # LiveStatus use EventSub to get update directly from Twitch, you need to create a webhook to receive the event
  webhookPort: 8080
  webhookSecret: "" # Random ASCII string between 10 and 100 characters to secure the webhook
  webhookUrl: "" # Your public URL to the webhook (https://<ip>:<port>/[path])

discord:
  # Go to https://discord.com/developers/applications, create a bot application
  # Add your bot on your server: https://discord.com/api/oauth2/authorize?client_id=<Insert your bot Application ID here>&permissions=8590445568&scope=bot 
  # Make sure your robot has the permissions to publish in the channel
  token: "" # 
  servers:
    "<guildId>":
      - twitchId: "" # Get twitch id from name: https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
        lang: "<en|fr>" # You can add your own language in the i18n folder
        event:
          active: true
        message:
          active: true
          buttons: true
          channelId: ""
          roleMentionId: "<roleId|everyone|here>" # Empty to disable mention
```

Then run the application

```console
docker compose up -d
```
