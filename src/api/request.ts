interface FetchParam {
    method: HttpMethod;
    headers: Headers;
    body?: string;
}

export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PATCH = 'PATCH',
    DELETE = 'DELETE',
}

export function fetchURL(url: string, httpMethod: HttpMethod, headers: Headers, body?: Record<string, any>) {
    const params: FetchParam = {
        method: httpMethod,
        headers: headers,
    };
    if (body != null) {
        params.headers.set('Content-Type', 'application/json');
        params.body = JSON.stringify(body);
    }
    return fetch(url, params);
}
