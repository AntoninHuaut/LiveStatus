export default class LiveModel {

    public static readonly STREAM_IMAGE_WIDTH: number = 1920;
    public static readonly STREAM_IMAGE_HEIGHT: number = 1080;

    private static readonly BASE_GAME_URL: string = 'https://static-cdn.jtvnw.net/ttv-boxart';
    public static readonly GAME_THUMBNAIL_WIDTH: number = 288;
    public static readonly GAME_THUMBNAIL_HEIGHT: number = 384;

    private readonly _userName: string;

    private _isOnline: boolean = false;

    private _gameName: string = '';

    private _streamTitle: string = '';
    private _viewerCount: number = 0;
    private _startedAt: Date = new Date(0);

    private _streamImageUrl: string = '';
    private _gameImageUrl: string = '';

    public constructor(userName: string) {
        this._userName = userName;
    }

    get userName(): string {
        return this._userName;
    }

    get isOnline(): boolean {
        return this._isOnline;
    }

    get gameName(): string {
        return this._gameName;
    }

    get streamTitle(): string {
        return this._streamTitle;
    }

    get viewerCount(): number {
        return this._viewerCount;
    }

    get startedAt(): Date {
        return this._startedAt;
    }

    get streamImageUrl(): string {
        return this._streamImageUrl;
    }

    get gameImageUrl(): string {
        return this._gameImageUrl;
    }

    set gameName(value: string) {
        this._gameName = value;
    }

    set isOnline(value: boolean) {
        this._isOnline = value;
    }

    set streamTitle(value: string) {
        this._streamTitle = value;
    }

    set viewerCount(value: number) {
        this._viewerCount = value;
    }

    set startedAt(value: Date) {
        this._startedAt = value;
    }

    set streamImageUrl(streamImageUrl: string) {
        this._streamImageUrl = streamImageUrl
            .replace('{width}', String(LiveModel.STREAM_IMAGE_WIDTH))
            .replace('{height}', String(LiveModel.STREAM_IMAGE_HEIGHT));
    }

    set gameImageUrl(gameId: string) {
        const baseUrl = LiveModel.BASE_GAME_URL;
        const width = LiveModel.GAME_THUMBNAIL_WIDTH;
        const height = LiveModel.GAME_THUMBNAIL_HEIGHT;
        this._gameImageUrl = new URL(`${baseUrl}/${gameId}-${width}x${height}.jpg`).href;
    }
}