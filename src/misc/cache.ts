import { DiscordIdsCacheModel } from '../type/IDiscord.ts';
import { createLiveData, ILiveData } from '../type/ILiveData.ts';

const CACHE_VERSION = 'v2';
const getCacheKey = (discordChannelId: string, twitchUserName: string): string => `${discordChannelId}-${twitchUserName}-${CACHE_VERSION}`;

export function getDiscord(discordChannelId: string, twitchUserName: string): DiscordIdsCacheModel {
    const item = localStorage.getItem(getCacheKey(discordChannelId, twitchUserName));
    return item ? JSON.parse(item) : { messageId: '', eventId: '' };
}

export function setDiscord(discordChannelId: string, twitchUserName: string, idItem: DiscordIdsCacheModel) {
    localStorage.setItem(getCacheKey(discordChannelId, twitchUserName), JSON.stringify(idItem));
}

const lives: Map<string, ILiveData> = new Map();

export function getTwitch(userName: string): ILiveData {
    let liveData: ILiveData | undefined = lives.get(userName);
    if (!liveData) {
        liveData = createLiveData(userName);
        lives.set(userName, liveData);
    }
    return liveData;
}
