"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
var _nextUrl = require("../next-url");
var _utils = require("../utils");
var _cookies = require("./cookies");
const INTERNALS = Symbol('internal response');
const REDIRECTS = new Set([
    301,
    302,
    303,
    307,
    308
]);
class NextResponse extends Response {
    constructor(body, init = {}){
        super(body, init);
        this[INTERNALS] = {
            cookies: new _cookies.NextCookies(this),
            url: init.url ? new _nextUrl.NextURL(init.url, {
                headers: (0, _utils).toNodeHeaders(this.headers),
                nextConfig: init.nextConfig
            }) : undefined
        };
    }
    get cookies() {
        return this[INTERNALS].cookies;
    }
    static json(body, init) {
        const { headers , ...responseInit } = init || {};
        return new NextResponse(JSON.stringify(body), {
            ...responseInit,
            headers: {
                ...headers,
                'content-type': 'application/json'
            }
        });
    }
    static redirect(url, status = 307) {
        if (!REDIRECTS.has(status)) {
            throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new NextResponse(null, {
            headers: {
                Location: (0, _utils).validateURL(url)
            },
            status
        });
    }
    static rewrite(destination) {
        return new NextResponse(null, {
            headers: {
                'x-middleware-rewrite': (0, _utils).validateURL(destination)
            }
        });
    }
    static next() {
        return new NextResponse(null, {
            headers: {
                'x-middleware-next': '1'
            }
        });
    }
}
exports.NextResponse = NextResponse;

//# sourceMappingURL=response.js.map