"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "TransformStream", {
    enumerable: true,
    get: function() {
        return _webStreamsPolyfill.TransformStream;
    }
});
exports.ReadableStream = void 0;
var _webStreamsPolyfill = require("next/dist/compiled/web-streams-polyfill");
class ReadableStream {
    constructor(opts = {}){
        let closed = false;
        let pullPromise;
        let transformController;
        const { readable , writable  } = new _webStreamsPolyfill.TransformStream({
            start: (controller)=>{
                transformController = controller;
            }
        }, undefined, {
            highWaterMark: 1
        });
        const writer = writable.getWriter();
        const encoder = new TextEncoder();
        const controller1 = {
            get desiredSize () {
                return transformController.desiredSize;
            },
            close: ()=>{
                if (!closed) {
                    closed = true;
                    writer.close();
                }
            },
            enqueue: (chunk)=>{
                writer.write(typeof chunk === 'string' ? encoder.encode(chunk) : chunk);
                pull();
            },
            error: (reason)=>{
                transformController.error(reason);
            }
        };
        const pull = ()=>{
            if (opts.pull) {
                if (!pullPromise) {
                    pullPromise = Promise.resolve().then(()=>{
                        pullPromise = 0;
                        opts.pull(controller1);
                    });
                }
            }
        };
        if (opts.start) {
            opts.start(controller1);
        }
        if (opts.cancel) {
            readable.cancel = (reason)=>{
                opts.cancel(reason);
                return readable.cancel(reason);
            };
        }
        pull();
        return readable;
    }
}
exports.ReadableStream = ReadableStream;

//# sourceMappingURL=readable-stream.js.map