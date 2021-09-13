import {ConfigModule} from "../model/Config.ts";
import Logger from "../utils/Logger.ts";
import {Requests} from "../model/Requests.ts";
import TwitchConfig = ConfigModule.TwitchConfig;
import HttpMethod = Requests.HttpMethod;

export default class TwitchRequest {

    private readonly twitchConfig: TwitchConfig;

    private _accessToken: string = '';
    private accessTokenExpirationDate: Date = new Date(0);

    public constructor(twitchConfig: ConfigModule.TwitchConfig) {
        this.twitchConfig = twitchConfig;
    }

    public async getStreams(twitchUserName: string) {
        const queryParams: string = new URLSearchParams({user_login: twitchUserName}).toString();
        return await this.fetchHelix(`streams?` + queryParams).then(res => res.json());
    }

    private async getAccessToken() {
        if (new Date() >= this.accessTokenExpirationDate) {
            await this.generateAccessToken();
        }
        return this._accessToken;
    }

    private async generateAccessToken() {
        const queryParams: string = new URLSearchParams({
            client_id: this.twitchConfig.clientId,
            client_secret: this.twitchConfig.clientSecret,
            grant_type: 'client_credentials'
        }).toString();

        const res: Response = await Requests.fetchURL(`https://id.twitch.tv/oauth2/token?` + queryParams, HttpMethod.POST, new Headers(), null);
        if (res.status != 200) {
            const body = await res.text();
            Logger.error(`Unable to generate accessToken: \n${body}`);
            return;
        }

        const json = await res.json();
        this._accessToken = json.access_token;
        this.accessTokenExpirationDate = new Date(Date.now() + json.expires_in * 1000);
    }

    private async fetchHelix(apiPath: string) {
        const validAccessToken = await this.getAccessToken();
        const headers: Headers = new Headers({
            'Authorization': 'Bearer ' + validAccessToken,
            'client-id': this.twitchConfig.clientId,
        });
        return await Requests.fetchURL(`https://api.twitch.tv/helix/${apiPath}`, HttpMethod.GET, headers, null);
    }
}