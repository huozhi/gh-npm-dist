"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = middlewareLoader;
var _getModuleBuildInfo = require("./get-module-build-info");
var _stringifyRequest = require("../stringify-request");
var _constants = require("../../../lib/constants");
function middlewareLoader() {
    const { absolutePagePath , page , matcherRegexp  } = this.getOptions();
    const stringifiedPagePath = (0, _stringifyRequest).stringifyRequest(this, absolutePagePath);
    const buildInfo = (0, _getModuleBuildInfo).getModuleBuildInfo(this._module);
    buildInfo.nextEdgeMiddleware = {
        matcherRegexp,
        page: page.replace(new RegExp(`/${_constants.MIDDLEWARE_LOCATION_REGEXP}$`), '') || '/'
    };
    return `
        import { adapter, blockUnallowedResponse } from 'next/dist/server/web/adapter'

        // The condition is true when the "process" module is provided
        if (process !== global.process) {
          // prefer local process but global.process has correct "env"
          process.env = global.process.env;
          global.process = process;
        }

        var mod = require(${stringifiedPagePath})
        var handler = mod.middleware || mod.default;

        if (typeof handler !== 'function') {
          throw new Error('The Middleware "pages${page}" must export a \`middleware\` or a \`default\` function');
        }

        export default function (opts) {
          return blockUnallowedResponse(adapter({
              ...opts,
              page: ${JSON.stringify(page)},
              handler,
          }))
        }
    `;
}

//# sourceMappingURL=next-middleware-loader.js.map