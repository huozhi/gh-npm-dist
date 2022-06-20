"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getHostname = getHostname;
function getHostname(parsed, headers) {
    var ref;
    return (ref = !Array.isArray(headers === null || headers === void 0 ? void 0 : headers.host) && (headers === null || headers === void 0 ? void 0 : headers.host) || parsed.hostname) === null || ref === void 0 ? void 0 : ref.split(':')[0].toLowerCase();
}

//# sourceMappingURL=get-hostname.js.map