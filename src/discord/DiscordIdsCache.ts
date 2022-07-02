export interface DiscordIdsCacheFormat {
  messageId: string;
  eventId: string;
}

export class DiscordIdsCache {
  private static instance: DiscordIdsCache;
  private static CACHE_VERSION = "v2";

  private constructor() {
    // Singleton
  }

  public get(
    discordChannelId: string,
    twitchUserName: string,
  ): DiscordIdsCacheFormat {
    const item = localStorage.getItem(
      this.getKey(discordChannelId, twitchUserName),
    );
    return item ? JSON.parse(item) : { messageId: "", eventId: "" };
  }

  public set(
    discordChannelId: string,
    twitchUserName: string,
    idItem: DiscordIdsCacheFormat,
  ) {
    localStorage.setItem(
      this.getKey(discordChannelId, twitchUserName),
      JSON.stringify(idItem),
    );
  }

  private getKey(discordChannelId: string, twitchUserName: string): string {
    return `${discordChannelId}-${twitchUserName}-${DiscordIdsCache.CACHE_VERSION}`;
  }

  public static getInstance(): DiscordIdsCache {
    if (!DiscordIdsCache.instance) {
      DiscordIdsCache.instance = new DiscordIdsCache();
    }

    return DiscordIdsCache.instance;
  }
}
