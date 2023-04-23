import { getStreams } from '../api/twitch_request.ts';
import * as cache from '../misc/cache.ts';
import * as Logger from '../misc/logger.ts';
import { ILiveData } from '../type/ILiveData.ts';

export interface TwitchRunnable {
    tick: () => Promise<void>;
}

export function createTwitchRunnable(twitchUsername: string): TwitchRunnable {
    Logger.info(`new TwitchRunnable (${twitchUsername})`);

    const tick = async () => {
        Logger.debug(`TwitchRunnable (${twitchUsername}) ticking`);

        try {
            const json = await getStreams(twitchUsername);
            Logger.debug(`\n${JSON.stringify(json, null, 2)}`);

            const dataArray = json.data;
            const liveData: ILiveData = cache.getTwitch(twitchUsername);

            liveData.setOnline(dataArray.length > 0 && dataArray[0]?.type === 'live');
            if (liveData.isOnline()) {
                liveData.setOnline(true);
                liveData.setGameName(dataArray[0].game_name);
                liveData.setStreamTitle(dataArray[0].title);
                liveData.setViewerCount(dataArray[0].viewer_count);
                liveData.setStartedAt(new Date(dataArray[0].started_at));
                liveData.setStreamImageUrl(dataArray[0].thumbnail_url);
                await liveData.setGameImageUrl(dataArray[0].game_id);
                try {
                    liveData.setStreamImageUrlBase64(await fetchBlobImg(liveData.streamImageUrl()));
                } catch (err) {
                    Logger.error(`[ILiveData::streamImageUrl] Error parsing streamImage url: "${liveData.streamImageUrl}" error:\n${err.stack}`);
                }
            }
        } catch (err) {
            Logger.error(`TwitchRunnable ${twitchUsername} error:\n${err.stack}`);
        }
    };

    const fetchBlobImg = (url: string) => {
        return fetch(url)
            .then((response) => response.blob())
            .then((blob) => {
                const reader = new FileReader();
                return new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            });
    };

    return { tick };
}
