"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.waitUntilSymbol = void 0;
var _error = require("../error");
var _key, _key1;
const responseSymbol = Symbol('response');
const passThroughSymbol = Symbol('passThrough');
const waitUntilSymbol = Symbol('waitUntil');
exports.waitUntilSymbol = waitUntilSymbol;
class FetchEvent {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(_request){
        this[_key] = [];
        this[_key1] = false;
    }
    respondWith(response) {
        if (!this[responseSymbol]) {
            this[responseSymbol] = Promise.resolve(response);
        }
    }
    passThroughOnException() {
        this[passThroughSymbol] = true;
    }
    waitUntil(promise) {
        this[waitUntilSymbol].push(promise);
    }
}
_key = waitUntilSymbol;
_key1 = passThroughSymbol;
class NextFetchEvent extends FetchEvent {
    constructor(params){
        super(params.request);
        this.sourcePage = params.page;
    }
    /**
   * @deprecated The `request` is now the first parameter and the API is now async.
   *
   * Read more: https://nextjs.org/docs/messages/middleware-new-signature
   */ get request() {
        throw new _error.PageSignatureError({
            page: this.sourcePage
        });
    }
    /**
   * @deprecated Using `respondWith` is no longer needed.
   *
   * Read more: https://nextjs.org/docs/messages/middleware-new-signature
   */ respondWith() {
        throw new _error.PageSignatureError({
            page: this.sourcePage
        });
    }
}
exports.NextFetchEvent = NextFetchEvent;

//# sourceMappingURL=fetch-event.js.map