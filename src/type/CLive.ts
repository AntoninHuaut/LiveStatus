import * as Logger from '../util/logger.ts';

export default class CLive {
    public static readonly STREAM_IMAGE_WIDTH: number = 1920;
    public static readonly STREAM_IMAGE_HEIGHT: number = 1080;

    private static readonly BASE_GAME_URL: string = 'https://static-cdn.jtvnw.net/ttv-boxart';
    public static readonly GAME_THUMBNAIL_WIDTH: number = 288;
    public static readonly GAME_THUMBNAIL_HEIGHT: number = 384;

    private readonly _userName: string;

    private _isOnline = false;

    private _gameName = '';

    private _streamTitle = '';
    private _viewerCount = 0;
    private _startedAt: Date = new Date(0);

    private _streamImageUrl = '';
    private _gameImageUrl = '';
    private _streamImageUrlBase64 = '';

    public constructor(userName: string) {
        this._userName = userName;
    }

    get userName(): string {
        return this._userName;
    }

    get isOnline(): boolean {
        return this._isOnline;
    }

    set isOnline(value: boolean) {
        this._isOnline = value;
    }

    get gameName(): string {
        return this._gameName;
    }

    set gameName(value: string) {
        this._gameName = value;
    }

    get streamTitle(): string {
        return this._streamTitle;
    }

    set streamTitle(value: string) {
        this._streamTitle = value;
    }

    get viewerCount(): number {
        return this._viewerCount;
    }

    set viewerCount(value: number) {
        this._viewerCount = value;
    }

    get startedAt(): Date {
        return this._startedAt;
    }

    set startedAt(value: Date) {
        this._startedAt = value;
    }

    get streamImageUrl(): string {
        return this._streamImageUrl;
    }

    set streamImageUrl(streamImageUrl: string) {
        this._streamImageUrl = streamImageUrl.replace('{width}', String(CLive.STREAM_IMAGE_WIDTH)).replace('{height}', String(CLive.STREAM_IMAGE_HEIGHT));
    }

    set streamImageUrlBase64(streamImageUrlBase64: string) {
        this._streamImageUrlBase64 = streamImageUrlBase64;
    }

    get streamImageUrlBase64(): string {
        return this._streamImageUrlBase64;
    }

    get gameImageUrl(): string {
        return this._gameImageUrl;
    }

    async setGameImageUrl(gameId: string) {
        const baseUrl = CLive.BASE_GAME_URL;
        const width = CLive.GAME_THUMBNAIL_WIDTH;
        const height = CLive.GAME_THUMBNAIL_HEIGHT;

        const igdbURL = new URL(`${baseUrl}/${gameId}_IGDB-${width}x${height}.jpg`).href;
        const twitchURL = new URL(`${baseUrl}/${gameId}-${width}x${height}.jpg`).href;

        try {
            const res = await fetch(igdbURL);
            this._gameImageUrl = res.redirected ? twitchURL : igdbURL;
        } catch (err) {
            Logger.error(`[CLive::setGameImageUrl] Error checking game IGDB: "${igdbURL}" error:\n${err.stack}`);
        }
    }

    get liveUrl(): string {
        return `https://twitch.tv/${this.userName}`;
    }
}
