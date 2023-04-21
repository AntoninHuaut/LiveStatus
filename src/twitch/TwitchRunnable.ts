import LiveModel from '../model/LiveModel.ts';
import * as Logger from '../utils/Logger.ts';
import TwitchCache from './TwitchCache.ts';
import TwitchRequest from './TwitchRequest.ts';

export default class TwitchRunnable {
    private readonly twitchCache: TwitchCache;
    private readonly twitchRequest: TwitchRequest;
    private readonly twitchUsername: string;

    constructor(twitchRequest: TwitchRequest, twitchUsername: string) {
        this.twitchCache = TwitchCache.getInstance();
        this.twitchRequest = twitchRequest;
        this.twitchUsername = twitchUsername;
        Logger.info(`new TwitchRunnable (${twitchUsername})`);
    }

    public async tick(): Promise<void> {
        Logger.debug(`TwitchRunnable (${this.twitchUsername}) ticking`);

        try {
            const json = await this.twitchRequest.getStreams(this.twitchUsername);
            Logger.debug(`\n${JSON.stringify(json, null, 2)}`);

            const dataArray = json.data;
            const liveModel: LiveModel = this.twitchCache.get(this.twitchUsername);

            if (dataArray.length) {
                const dataLive = dataArray[0];
                if (dataLive.type === 'live') {
                    liveModel.isOnline = true;
                    liveModel.gameName = dataLive.game_name;
                    liveModel.streamTitle = dataLive.title;
                    liveModel.viewerCount = dataLive.viewer_count;
                    liveModel.startedAt = new Date(dataLive.started_at);
                    liveModel.streamImageUrl = dataLive.thumbnail_url;
                    await liveModel.setGameImageUrl(dataLive.game_id);
                    try {
                        liveModel.streamImageUrlBase64 = await this.fetchBlobImg(liveModel.streamImageUrl);
                    } catch (err) {
                        Logger.error(`[LiveModel::streamImageUrl] Error parsing streamImage url: "${liveModel.streamImageUrl}" error:\n${err.stack}`);
                    }

                    return;
                }
            }

            liveModel.isOnline = false;
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
