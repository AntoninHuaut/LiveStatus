interface FetchParam {
    method: HttpMethod;
    headers: Headers;
    body?: string;
}

export enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PATCH = "PATCH",
    DELETE = "DELETE"
}

export async function fetchURL(url: string, httpMethod: HttpMethod, headers: Headers, body?: any) {
    const params: FetchParam = {
        method: httpMethod,
        headers: headers
    }
    if (body != undefined && body != null) {
        params.body = JSON.stringify(body);
    }
    return await fetch(url, params);
}