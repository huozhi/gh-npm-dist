"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.loadBindings = loadBindings;
exports.isWasm = isWasm;
exports.transform = transform;
exports.transformSync = transformSync;
exports.minify = minify;
exports.minifySync = minifySync;
exports.bundle = bundle;
exports.parse = parse;
exports.getBinaryMetadata = getBinaryMetadata;
exports.teardownTraceSubscriber = exports.initCustomTraceSubscriber = exports.lockfilePatchPromise = void 0;
var _path = _interopRequireDefault(require("path"));
var _url = require("url");
var _os = require("os");
var _triples = require("next/dist/compiled/@napi-rs/triples");
var Log = _interopRequireWildcard(require("../output/log"));
var _options = require("./options");
var _swcLoadFailure = require("../../telemetry/events/swc-load-failure");
var _patchIncorrectLockfile = require("../../lib/patch-incorrect-lockfile");
var _downloadWasmSwc = require("../../lib/download-wasm-swc");
var _packageJson = require("next/package.json");
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _interopRequireWildcard(obj) {
    if (obj && obj.__esModule) {
        return obj;
    } else {
        var newObj = {};
        if (obj != null) {
            for(var key in obj){
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {};
                    if (desc.get || desc.set) {
                        Object.defineProperty(newObj, key, desc);
                    } else {
                        newObj[key] = obj[key];
                    }
                }
            }
        }
        newObj.default = obj;
        return newObj;
    }
}
const ArchName = (0, _os).arch();
const PlatformName = (0, _os).platform();
const triples = _triples.platformArchTriples[PlatformName][ArchName] || [];
let nativeBindings;
let wasmBindings;
let downloadWasmPromise;
let pendingBindings;
let swcTraceFlushGuard;
const lockfilePatchPromise = {};
exports.lockfilePatchPromise = lockfilePatchPromise;
async function loadBindings() {
    if (pendingBindings) {
        return pendingBindings;
    }
    pendingBindings = new Promise(async (resolve, reject)=>{
        if (!lockfilePatchPromise.cur) {
            // always run lockfile check once so that it gets patched
            // even if it doesn't fail to load locally
            lockfilePatchPromise.cur = (0, _patchIncorrectLockfile).patchIncorrectLockfile(process.cwd()).catch(console.error);
        }
        let attempts = [];
        try {
            return resolve(loadNative());
        } catch (a) {
            attempts = attempts.concat(a);
        }
        try {
            let bindings = await loadWasm();
            (0, _swcLoadFailure).eventSwcLoadFailure({
                wasm: 'enabled'
            });
            return resolve(bindings);
        } catch (a1) {
            attempts = attempts.concat(a1);
        }
        try {
            // if not installed already download wasm package on-demand
            // we download to a custom directory instead of to node_modules
            // as node_module import attempts are cached and can't be re-attempted
            // x-ref: https://github.com/nodejs/modules/issues/307
            const wasmDirectory = _path.default.join(_path.default.dirname(require.resolve('next/package.json')), 'wasm');
            if (!downloadWasmPromise) {
                downloadWasmPromise = (0, _downloadWasmSwc).downloadWasmSwc(_packageJson.version, wasmDirectory);
            }
            await downloadWasmPromise;
            let bindings = await loadWasm((0, _url).pathToFileURL(wasmDirectory).href);
            (0, _swcLoadFailure).eventSwcLoadFailure({
                wasm: 'fallback'
            });
            // still log native load attempts so user is
            // aware it failed and should be fixed
            for (const attempt of attempts){
                Log.warn(attempt);
            }
            return resolve(bindings);
        } catch (a2) {
            attempts = attempts.concat(a2);
        }
        logLoadFailure(attempts, true);
    });
    return pendingBindings;
}
function loadBindingsSync() {
    let attempts = [];
    try {
        return loadNative();
    } catch (a) {
        attempts = attempts.concat(a);
    }
    // we can leverage the wasm bindings if they are already
    // loaded
    if (wasmBindings) {
        return wasmBindings;
    }
    logLoadFailure(attempts);
}
let loggingLoadFailure = false;
function logLoadFailure(attempts, triedWasm = false) {
    // make sure we only emit the event and log the failure once
    if (loggingLoadFailure) return;
    loggingLoadFailure = true;
    for (let attempt of attempts){
        Log.warn(attempt);
    }
    (0, _swcLoadFailure).eventSwcLoadFailure({
        wasm: triedWasm ? 'failed' : undefined
    }).then(()=>lockfilePatchPromise.cur || Promise.resolve()
    ).finally(()=>{
        Log.error(`Failed to load SWC binary for ${PlatformName}/${ArchName}, see more info here: https://nextjs.org/docs/messages/failed-loading-swc`);
        process.exit(1);
    });
}
async function loadWasm(importPath = '') {
    if (wasmBindings) {
        return wasmBindings;
    }
    let attempts = [];
    for (let pkg of [
        '@next/swc-wasm-nodejs',
        '@next/swc-wasm-web'
    ]){
        try {
            let pkgPath = pkg;
            if (importPath) {
                // the import path must be exact when not in node_modules
                pkgPath = _path.default.join(importPath, pkg, 'wasm.js');
            }
            let bindings = await import(pkgPath);
            if (pkg === '@next/swc-wasm-web') {
                bindings = await bindings.default();
            }
            Log.info('Using experimental wasm build of next-swc');
            wasmBindings = {
                isWasm: true,
                transform (src, options) {
                    return bindings.transformSync(src.toString(), options);
                },
                transformSync (src, options) {
                    return bindings.transformSync(src.toString(), options);
                },
                minify (src, options) {
                    return bindings.minifySync(src.toString(), options);
                },
                minifySync (src, options) {
                    return bindings.minifySync(src.toString(), options);
                },
                parse (src, options) {
                    const astStr = bindings.parseSync(src.toString(), options);
                    return astStr;
                },
                parseSync (src, options) {
                    const astStr = bindings.parseSync(src.toString(), options);
                    return astStr;
                },
                getTargetTriple () {
                    return undefined;
                }
            };
            return wasmBindings;
        } catch (e) {
            // Only log attempts for loading wasm when loading as fallback
            if (importPath) {
                if ((e === null || e === void 0 ? void 0 : e.code) === 'ERR_MODULE_NOT_FOUND') {
                    attempts.push(`Attempted to load ${pkg}, but it was not installed`);
                } else {
                    var _message;
                    attempts.push(`Attempted to load ${pkg}, but an error occurred: ${(_message = e.message) !== null && _message !== void 0 ? _message : e}`);
                }
            }
        }
    }
    throw attempts;
}
function loadNative() {
    if (nativeBindings) {
        return nativeBindings;
    }
    let bindings;
    let attempts = [];
    for (const triple of triples){
        try {
            bindings = require(`@next/swc/native/next-swc.${triple.platformArchABI}.node`);
            Log.info('Using locally built binary of @next/swc');
            break;
        } catch (e) {}
    }
    if (!bindings) {
        for (const triple of triples){
            let pkg = `@next/swc-${triple.platformArchABI}`;
            try {
                bindings = require(pkg);
                break;
            } catch (e) {
                if ((e === null || e === void 0 ? void 0 : e.code) === 'MODULE_NOT_FOUND') {
                    attempts.push(`Attempted to load ${pkg}, but it was not installed`);
                } else {
                    var _message;
                    attempts.push(`Attempted to load ${pkg}, but an error occurred: ${(_message = e.message) !== null && _message !== void 0 ? _message : e}`);
                }
            }
        }
    }
    if (bindings) {
        nativeBindings = {
            isWasm: false,
            transform (src, options) {
                var ref;
                const isModule = typeof src !== undefined && typeof src !== 'string' && !Buffer.isBuffer(src);
                options = options || {};
                if (options === null || options === void 0 ? void 0 : (ref = options.jsc) === null || ref === void 0 ? void 0 : ref.parser) {
                    var _syntax;
                    options.jsc.parser.syntax = (_syntax = options.jsc.parser.syntax) !== null && _syntax !== void 0 ? _syntax : 'ecmascript';
                }
                return bindings.transform(isModule ? JSON.stringify(src) : src, isModule, toBuffer(options));
            },
            transformSync (src, options) {
                var ref;
                if (typeof src === undefined) {
                    throw new Error("transformSync doesn't implement reading the file from filesystem");
                } else if (Buffer.isBuffer(src)) {
                    throw new Error("transformSync doesn't implement taking the source code as Buffer");
                }
                const isModule = typeof src !== 'string';
                options = options || {};
                if (options === null || options === void 0 ? void 0 : (ref = options.jsc) === null || ref === void 0 ? void 0 : ref.parser) {
                    var _syntax;
                    options.jsc.parser.syntax = (_syntax = options.jsc.parser.syntax) !== null && _syntax !== void 0 ? _syntax : 'ecmascript';
                }
                return bindings.transformSync(isModule ? JSON.stringify(src) : src, isModule, toBuffer(options));
            },
            minify (src, options) {
                return bindings.minify(toBuffer(src), toBuffer(options !== null && options !== void 0 ? options : {}));
            },
            minifySync (src, options) {
                return bindings.minifySync(toBuffer(src), toBuffer(options !== null && options !== void 0 ? options : {}));
            },
            bundle (options) {
                return bindings.bundle(toBuffer(options));
            },
            parse (src, options) {
                return bindings.parse(src, toBuffer(options !== null && options !== void 0 ? options : {}));
            },
            getTargetTriple: bindings.getTargetTriple,
            initCustomTraceSubscriber: bindings.initCustomTraceSubscriber,
            teardownTraceSubscriber: bindings.teardownTraceSubscriber
        };
        return nativeBindings;
    }
    throw attempts;
}
function toBuffer(t) {
    return Buffer.from(JSON.stringify(t));
}
async function isWasm() {
    let bindings = await loadBindings();
    return bindings.isWasm;
}
async function transform(src, options) {
    let bindings = await loadBindings();
    return bindings.transform(src, options);
}
function transformSync(src, options) {
    let bindings = loadBindingsSync();
    return bindings.transformSync(src, options);
}
async function minify(src, options) {
    let bindings = await loadBindings();
    return bindings.minify(src, options);
}
function minifySync(src, options) {
    let bindings = loadBindingsSync();
    return bindings.minifySync(src, options);
}
async function bundle(options) {
    let bindings = loadBindingsSync();
    return bindings.bundle(toBuffer(options));
}
async function parse(src, options) {
    let bindings = await loadBindings();
    let parserOptions = (0, _options).getParserOptions(options);
    return bindings.parse(src, parserOptions).then((astStr)=>JSON.parse(astStr)
    );
}
function getBinaryMetadata() {
    var ref;
    let bindings;
    try {
        bindings = loadNative();
    } catch (e) {
    // Suppress exceptions, this fn allows to fail to load native bindings
    }
    return {
        target: bindings === null || bindings === void 0 ? void 0 : (ref = bindings.getTargetTriple) === null || ref === void 0 ? void 0 : ref.call(bindings)
    };
}
const initCustomTraceSubscriber = (()=>{
    return (filename)=>{
        if (!swcTraceFlushGuard) {
            // Wasm binary doesn't support trace emission
            let bindings = loadNative();
            swcTraceFlushGuard = bindings.initCustomTraceSubscriber(filename);
        }
    };
})();
exports.initCustomTraceSubscriber = initCustomTraceSubscriber;
const teardownTraceSubscriber = (()=>{
    let flushed = false;
    return ()=>{
        if (!flushed) {
            flushed = true;
            try {
                let bindings = loadNative();
                if (swcTraceFlushGuard) {
                    bindings.teardownTraceSubscriber(swcTraceFlushGuard);
                }
            } catch (e) {
            // Suppress exceptions, this fn allows to fail to load native bindings
            }
        }
    };
})();
exports.teardownTraceSubscriber = teardownTraceSubscriber;

//# sourceMappingURL=index.js.map