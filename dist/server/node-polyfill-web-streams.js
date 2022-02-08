"use strict";
var _readableStream = require("./web/sandbox/readable-stream");
// Polyfill Web Streams in the Node.js environment
if (!global.ReadableStream) {
    global.ReadableStream = _readableStream.ReadableStream;
    global.TransformStream = _readableStream.TransformStream;
}

//# sourceMappingURL=node-polyfill-web-streams.js.map