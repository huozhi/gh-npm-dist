"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.isBlockedPage = isBlockedPage;
exports.cleanAmpPath = cleanAmpPath;
exports.isBot = isBot;
exports.isTargetLikeServerless = isTargetLikeServerless;
exports.stripInternalQueries = stripInternalQueries;
var _constants = require("../shared/lib/constants");
function isBlockedPage(pathname) {
    return _constants.BLOCKED_PAGES.includes(pathname);
}
function cleanAmpPath(pathname) {
    if (pathname.match(/\?amp=(y|yes|true|1)/)) {
        pathname = pathname.replace(/\?amp=(y|yes|true|1)&?/, '?');
    }
    if (pathname.match(/&amp=(y|yes|true|1)/)) {
        pathname = pathname.replace(/&amp=(y|yes|true|1)/, '');
    }
    pathname = pathname.replace(/\?$/, '');
    return pathname;
}
function isBot(userAgent) {
    return /Googlebot|Mediapartners-Google|AdsBot-Google|googleweblight|Storebot-Google|Google-PageRenderer|Bingbot|BingPreview|Slurp|DuckDuckBot|baiduspider|yandex|sogou|LinkedInBot|bitlybot|tumblr|vkShare|quora link preview|facebookexternalhit|facebookcatalog|Twitterbot|applebot|redditbot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|ia_archiver/i.test(userAgent);
}
function isTargetLikeServerless(target) {
    const isServerless = target === 'serverless';
    const isServerlessTrace = target === 'experimental-serverless-trace';
    return isServerless || isServerlessTrace;
}
function stripInternalQueries(query) {
    delete query.__nextFallback;
    delete query.__nextLocale;
    delete query.__nextDefaultLocale;
    delete query.__nextIsNotFound;
    // RSC
    delete query.__flight__;
    delete query.__props__;
    // routing
    delete query.__flight_router_path__;
    return query;
}

//# sourceMappingURL=utils.js.map