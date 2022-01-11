export default class MessageIdCache {

    private static instance: MessageIdCache;

    private constructor() {
    }

    public get(discordChannelId: string, twitchUserName: string): string {
        console.log(localStorage.getItem(this.getKey(discordChannelId, twitchUserName)) ?? '')
        return localStorage.getItem(this.getKey(discordChannelId, twitchUserName)) ?? '';
    }

    public set(discordChannelId: string, twitchUserName: string, messageId: string) {
        console.log(this.getKey(discordChannelId, twitchUserName), messageId)
        localStorage.setItem(this.getKey(discordChannelId, twitchUserName), messageId);
    }

    private getKey(discordChannelId: string, twitchUserName: string): string {
        return `${discordChannelId}-${twitchUserName}`;
    }

    public static getInstance(): MessageIdCache {
        if (!MessageIdCache.instance) {
            MessageIdCache.instance = new MessageIdCache();
        }

        return MessageIdCache.instance;
    }
}