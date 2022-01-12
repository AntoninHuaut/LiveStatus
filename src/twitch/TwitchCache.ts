import LiveModel from "../model/LiveModel.ts";

export default class TwitchCache {

    private static instance: TwitchCache;
    private readonly lives: Map<string, LiveModel> = new Map();

    private constructor() {
        // Singleton
    }

    public get(userName: string): LiveModel {
        let liveModel: LiveModel | undefined = this.lives.get(userName);
        if (!liveModel) {
            liveModel = new LiveModel(userName);
            this.lives.set(userName, liveModel);
        }
        return liveModel;
    }

    public static getInstance(): TwitchCache {
        if (!TwitchCache.instance) {
            TwitchCache.instance = new TwitchCache();
        }

        return TwitchCache.instance;
    }
}