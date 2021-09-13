import HttpMethod = Requests.HttpMethod;

interface FetchParam {
    method: HttpMethod;
    headers: Headers;
    body?: string;
}

export namespace Requests {

    export enum HttpMethod {
        GET = "GET",
        POST = "POST"
    }

    export async function fetchURL(url: string, httpMethod: HttpMethod, headers: Headers, body: any) {
        const params: FetchParam = {
            method: httpMethod,
            headers: headers
        }
        if (body != null) {
            params.body = JSON.stringify(body);
        }
        return await fetch(url, params);
    }
}