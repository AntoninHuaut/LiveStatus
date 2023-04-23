import * as Logger from '../misc/logger.ts';

export const STREAM_IMAGE_WIDTH = 1920;
export const STREAM_IMAGE_HEIGHT = 1080;

const BASE_GAME_URL = 'https://static-cdn.jtvnw.net/ttv-boxart';
export const GAME_THUMBNAIL_WIDTH = 288;
export const GAME_THUMBNAIL_HEIGHT = 384;

export interface ILiveData {
    userName: () => string;
    isOnline: () => boolean;
    setOnline: (value: boolean) => void;
    gameName: () => string;
    setGameName: (value: string) => void;
    streamTitle: () => string;
    setStreamTitle: (value: string) => void;
    viewerCount: () => number;
    setViewerCount: (value: number) => void;
    startedAt: () => Date;
    setStartedAt: (value: Date) => void;
    streamImageUrl: () => string;
    setStreamImageUrl: (value: string) => void;
    streamImageUrlBase64: () => string;
    setStreamImageUrlBase64: (value: string) => void;
    gameImageUrl: () => string;
    setGameImageUrl: (gameId: string) => Promise<void>;
    liveUrl: () => string;
}

export function createLiveData(userName: string): ILiveData {
    let isOnline = false;
    let gameName = '';
    let streamTitle = '';
    let viewerCount = 0;
    let startedAt = new Date(0);
    let streamImageUrl = '';
    let gameImageUrl = '';
    let streamImageUrlBase64 = '';

    return {
        userName: () => userName,
        isOnline: () => isOnline,
        setOnline: (value: boolean) => (isOnline = value),
        gameName: () => gameName,
        setGameName: (value: string) => (gameName = value),
        streamTitle: () => streamTitle,
        setStreamTitle: (value: string) => (streamTitle = value),
        viewerCount: () => viewerCount,
        setViewerCount: (value: number) => (viewerCount = value),
        startedAt: () => startedAt,
        setStartedAt: (value: Date) => (startedAt = value),
        streamImageUrl: () => streamImageUrl,
        setStreamImageUrl: (value: string) => (streamImageUrl = value.replace('{width}', `${STREAM_IMAGE_WIDTH}`).replace('{height}', `${STREAM_IMAGE_HEIGHT}`)),
        streamImageUrlBase64: () => streamImageUrlBase64,
        setStreamImageUrlBase64: (value: string) => (streamImageUrlBase64 = value),
        gameImageUrl: () => gameImageUrl,
        setGameImageUrl: async (gameId: string) => {
            const baseUrl = BASE_GAME_URL;
            const width = GAME_THUMBNAIL_WIDTH;
            const height = GAME_THUMBNAIL_HEIGHT;

            const igdbURL = new URL(`${baseUrl}/${gameId}_IGDB-${width}x${height}.jpg`).href;
            const twitchURL = new URL(`${baseUrl}/${gameId}-${width}x${height}.jpg`).href;

            try {
                const res = await fetch(igdbURL);
                gameImageUrl = res.redirected ? twitchURL : igdbURL;
            } catch (err) {
                Logger.error(`[ILiveData::setGameImageUrl] Error checking game IGDB: "${igdbURL}" error:\n${err.stack}`);
            }
        },
        liveUrl: () => `https://twitch.tv/${userName}`,
    };
}
