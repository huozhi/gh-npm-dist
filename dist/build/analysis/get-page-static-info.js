"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getPageStaticInfo = getPageStaticInfo;
var _extractConstValue = require("./extract-const-value");
var _parseModule = require("./parse-module");
var _fs = require("fs");
var _tryToParsePath = require("../../lib/try-to-parse-path");
var Log = _interopRequireWildcard(require("../output/log"));
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
async function getPageStaticInfo(params) {
    const { isDev , pageFilePath , nextConfig  } = params;
    const fileContent = await tryToReadFile(pageFilePath, !isDev) || '';
    if (/runtime|getStaticProps|getServerSideProps|matcher/.test(fileContent)) {
        var ref;
        const swcAST = await (0, _parseModule).parseModule(pageFilePath, fileContent);
        const { ssg , ssr  } = checkExports(swcAST);
        const config = (0, _extractConstValue).tryToExtractExportedConstValue(swcAST, 'config') || {};
        let runtime = [
            'experimental-edge',
            'edge'
        ].includes(config === null || config === void 0 ? void 0 : config.runtime) ? 'edge' : ssr || ssg ? (config === null || config === void 0 ? void 0 : config.runtime) || ((ref = nextConfig.experimental) === null || ref === void 0 ? void 0 : ref.runtime) : undefined;
        if (runtime === 'experimental-edge' || runtime === 'edge') {
            warnAboutExperimentalEdgeApiFunctions();
            runtime = 'edge';
        }
        const middlewareConfig = getMiddlewareConfig(config);
        return {
            ssr,
            ssg,
            ...middlewareConfig && {
                middleware: middlewareConfig
            },
            ...runtime && {
                runtime
            }
        };
    }
    return {
        ssr: false,
        ssg: false
    };
}
/**
 * Receives a parsed AST from SWC and checks if it belongs to a module that
 * requires a runtime to be specified. Those are:
 *   - Modules with `export function getStaticProps | getServerSideProps`
 *   - Modules with `export { getStaticProps | getServerSideProps } <from ...>`
 */ function checkExports(swcAST) {
    if (Array.isArray(swcAST === null || swcAST === void 0 ? void 0 : swcAST.body)) {
        try {
            for (const node of swcAST.body){
                var ref3, ref1;
                if (node.type === 'ExportDeclaration' && ((ref3 = node.declaration) === null || ref3 === void 0 ? void 0 : ref3.type) === 'FunctionDeclaration' && [
                    'getStaticProps',
                    'getServerSideProps'
                ].includes((ref1 = node.declaration.identifier) === null || ref1 === void 0 ? void 0 : ref1.value)) {
                    return {
                        ssg: node.declaration.identifier.value === 'getStaticProps',
                        ssr: node.declaration.identifier.value === 'getServerSideProps'
                    };
                }
                if (node.type === 'ExportNamedDeclaration') {
                    const values = node.specifiers.map((specifier)=>{
                        var ref, ref2;
                        return specifier.type === 'ExportSpecifier' && ((ref = specifier.orig) === null || ref === void 0 ? void 0 : ref.type) === 'Identifier' && ((ref2 = specifier.orig) === null || ref2 === void 0 ? void 0 : ref2.value);
                    });
                    return {
                        ssg: values.some((value)=>[
                                'getStaticProps'
                            ].includes(value)
                        ),
                        ssr: values.some((value)=>[
                                'getServerSideProps'
                            ].includes(value)
                        )
                    };
                }
            }
        } catch (err) {}
    }
    return {
        ssg: false,
        ssr: false
    };
}
async function tryToReadFile(filePath, shouldThrow) {
    try {
        return await _fs.promises.readFile(filePath, {
            encoding: 'utf8'
        });
    } catch (error) {
        if (shouldThrow) {
            throw error;
        }
    }
}
function getMiddlewareConfig(config) {
    const result = {};
    if (config.matcher) {
        result.pathMatcher = new RegExp(getMiddlewareRegExpStrings(config.matcher).join('|'));
        if (result.pathMatcher.source.length > 4096) {
            throw new Error(`generated matcher config must be less than 4096 characters.`);
        }
    }
    return result;
}
function getMiddlewareRegExpStrings(matcherOrMatchers) {
    if (Array.isArray(matcherOrMatchers)) {
        return matcherOrMatchers.flatMap((x)=>getMiddlewareRegExpStrings(x)
        );
    }
    if (typeof matcherOrMatchers !== 'string') {
        throw new Error('`matcher` must be a path matcher or an array of path matchers');
    }
    let matcher = matcherOrMatchers;
    if (!matcher.startsWith('/')) {
        throw new Error('`matcher`: path matcher must start with /');
    }
    const parsedPage = (0, _tryToParsePath).tryToParsePath(matcher);
    if (parsedPage.error) {
        throw new Error(`Invalid path matcher: ${matcher}`);
    }
    const regexes = [
        parsedPage.regexStr
    ].filter((x)=>!!x
    );
    if (regexes.length < 1) {
        throw new Error("Can't parse matcher");
    } else {
        return regexes;
    }
}
function warnAboutExperimentalEdgeApiFunctions() {
    if (warnedAboutExperimentalEdgeApiFunctions) {
        return;
    }
    Log.warn(`You are using an experimental edge runtime, the API might change.`);
    warnedAboutExperimentalEdgeApiFunctions = true;
}
let warnedAboutExperimentalEdgeApiFunctions = false;

//# sourceMappingURL=get-page-static-info.js.map