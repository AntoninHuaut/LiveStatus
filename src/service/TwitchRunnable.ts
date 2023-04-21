import { getStreams } from '../api/twitch_request.ts';
import * as cache from '../misc/cache.ts';
import * as Logger from '../misc/logger.ts';
import CLive from '../type/CLive.ts';

export default class TwitchRunnable {
    private readonly twitchUsername: string;

    constructor(twitchUsername: string) {
        this.twitchUsername = twitchUsername;
        Logger.info(`new TwitchRunnable (${twitchUsername})`);
    }

    public async tick(): Promise<void> {
        Logger.debug(`TwitchRunnable (${this.twitchUsername}) ticking`);

        try {
            const json = await getStreams(this.twitchUsername);
            Logger.debug(`\n${JSON.stringify(json, null, 2)}`);

            const dataArray = json.data;
            const liveData: CLive = cache.getTwitch(this.twitchUsername);

            if (dataArray.length) {
                const dataLive = dataArray[0];
                if (dataLive.type === 'live') {
                    liveData.isOnline = true;
                    liveData.gameName = dataLive.game_name;
                    liveData.streamTitle = dataLive.title;
                    liveData.viewerCount = dataLive.viewer_count;
                    liveData.startedAt = new Date(dataLive.started_at);
                    liveData.streamImageUrl = dataLive.thumbnail_url;
                    await liveData.setGameImageUrl(dataLive.game_id);
                    try {
                        liveData.streamImageUrlBase64 = await this.fetchBlobImg(liveData.streamImageUrl);
                    } catch (err) {
                        Logger.error(`[CLive::streamImageUrl] Error parsing streamImage url: "${liveData.streamImageUrl}" error:\n${err.stack}`);
                    }

                    return;
                }
            }

            liveData.isOnline = false;
        } catch (err) {
            Logger.error(`TwitchRunnable ${this.twitchUsername} error:\n${err.stack}`);
        }
    }

    private fetchBlobImg(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                fetch(url)
                    .then((response) => response.blob())
                    .then((blob) => {
                        const reader = new FileReader();
                        reader.onload = function () {
                            resolve(this.result as string);
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
            } catch (err) {
                reject(err);
            }
        });
    }
}
