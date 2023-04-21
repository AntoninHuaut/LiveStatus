import { fetchURL, HttpMethod } from '../api/request.ts';
import { config } from '../app.ts';
import * as Logger from '../util/Logger.ts';

let _accessToken = '';
let accessTokenExpirationDate: Date = new Date(0);

export function getStreams(twitchUserName: string) {
    const queryParams: string = new URLSearchParams({
        user_login: twitchUserName,
    }).toString();
    return fetchHelix(`streams?` + queryParams).then((res) => res.json());
}

async function getAccessToken() {
    if (new Date() >= accessTokenExpirationDate) {
        await generateAccessToken();
    }
    return _accessToken;
}

async function generateAccessToken() {
    const queryParams: string = new URLSearchParams({
        client_id: config.twitch.clientId,
        client_secret: config.twitch.clientSecret,
        grant_type: 'client_credentials',
    }).toString();

    const res: Response = await fetchURL(`https://id.twitch.tv/oauth2/token?` + queryParams, HttpMethod.POST, new Headers());
    if (res.status != 200) {
        const body = await res.text();
        Logger.error(`Unable to generate accessToken: \n${body}`);
        return;
    }

    const json = await res.json();
    _accessToken = json.access_token;
    accessTokenExpirationDate = new Date(Date.now() + json.expires_in * 1000);
}

async function fetchHelix(apiPath: string) {
    const validAccessToken = await getAccessToken();
    const headers: Headers = new Headers({
        Authorization: 'Bearer ' + validAccessToken,
        'client-id': config.twitch.clientId,
    });
    return fetchURL(`https://api.twitch.tv/helix/${apiPath}`, HttpMethod.GET, headers);
}
