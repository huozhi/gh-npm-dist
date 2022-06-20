"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getParserOptions = getParserOptions;
exports.getJestSWCOptions = getJestSWCOptions;
exports.getLoaderSWCOptions = getLoaderSWCOptions;
const nextDistPath = /(next[\\/]dist[\\/]shared[\\/]lib)|(next[\\/]dist[\\/]client)|(next[\\/]dist[\\/]pages)/;
const regeneratorRuntimePath = require.resolve('next/dist/compiled/regenerator-runtime');
function getParserOptions({ filename , jsConfig , ...rest }) {
    var ref;
    const isTSFile = filename.endsWith('.ts');
    const isTypeScript = isTSFile || filename.endsWith('.tsx');
    const enableDecorators = Boolean(jsConfig === null || jsConfig === void 0 ? void 0 : (ref = jsConfig.compilerOptions) === null || ref === void 0 ? void 0 : ref.experimentalDecorators);
    return {
        ...rest,
        syntax: isTypeScript ? 'typescript' : 'ecmascript',
        dynamicImport: true,
        decorators: enableDecorators,
        // Exclude regular TypeScript files from React transformation to prevent e.g. generic parameters and angle-bracket type assertion from being interpreted as JSX tags.
        [isTypeScript ? 'tsx' : 'jsx']: isTSFile ? false : true,
        importAssertions: true
    };
}
function getBaseSWCOptions({ filename , jest , development , hasReactRefresh , globalWindow , nextConfig , resolvedBaseUrl , jsConfig ,  }) {
    var ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9, ref10, ref11;
    const parserConfig = getParserOptions({
        filename,
        jsConfig
    });
    const paths = jsConfig === null || jsConfig === void 0 ? void 0 : (ref = jsConfig.compilerOptions) === null || ref === void 0 ? void 0 : ref.paths;
    const enableDecorators = Boolean(jsConfig === null || jsConfig === void 0 ? void 0 : (ref1 = jsConfig.compilerOptions) === null || ref1 === void 0 ? void 0 : ref1.experimentalDecorators);
    const emitDecoratorMetadata = Boolean(jsConfig === null || jsConfig === void 0 ? void 0 : (ref2 = jsConfig.compilerOptions) === null || ref2 === void 0 ? void 0 : ref2.emitDecoratorMetadata);
    const useDefineForClassFields = Boolean(jsConfig === null || jsConfig === void 0 ? void 0 : (ref3 = jsConfig.compilerOptions) === null || ref3 === void 0 ? void 0 : ref3.useDefineForClassFields);
    var ref12, ref13;
    return {
        jsc: {
            ...resolvedBaseUrl && paths ? {
                baseUrl: resolvedBaseUrl,
                paths
            } : {},
            externalHelpers: !process.versions.pnp,
            parser: parserConfig,
            experimental: {
                keepImportAssertions: true,
                plugins: (ref12 = nextConfig === null || nextConfig === void 0 ? void 0 : (ref4 = nextConfig.experimental) === null || ref4 === void 0 ? void 0 : ref4.swcPlugins) !== null && ref12 !== void 0 ? ref12 : undefined
            },
            transform: {
                // Enables https://github.com/swc-project/swc/blob/0359deb4841be743d73db4536d4a22ac797d7f65/crates/swc_ecma_ext_transforms/src/jest.rs
                ...jest ? {
                    hidden: {
                        jest: true
                    }
                } : {},
                legacyDecorator: enableDecorators,
                decoratorMetadata: emitDecoratorMetadata,
                useDefineForClassFields: useDefineForClassFields,
                react: {
                    importSource: (ref13 = jsConfig === null || jsConfig === void 0 ? void 0 : (ref5 = jsConfig.compilerOptions) === null || ref5 === void 0 ? void 0 : ref5.jsxImportSource) !== null && ref13 !== void 0 ? ref13 : (nextConfig === null || nextConfig === void 0 ? void 0 : (ref6 = nextConfig.compiler) === null || ref6 === void 0 ? void 0 : ref6.emotion) ? '@emotion/react' : 'react',
                    runtime: 'automatic',
                    pragma: 'React.createElement',
                    pragmaFrag: 'React.Fragment',
                    throwIfNamespace: true,
                    development: !!development,
                    useBuiltins: true,
                    refresh: !!hasReactRefresh
                },
                optimizer: {
                    simplify: false,
                    globals: jest ? null : {
                        typeofs: {
                            window: globalWindow ? 'object' : 'undefined'
                        },
                        envs: {
                            NODE_ENV: development ? '"development"' : '"production"'
                        }
                    }
                },
                regenerator: {
                    importPath: regeneratorRuntimePath
                }
            }
        },
        sourceMaps: jest ? 'inline' : undefined,
        styledComponents: (nextConfig === null || nextConfig === void 0 ? void 0 : (ref7 = nextConfig.compiler) === null || ref7 === void 0 ? void 0 : ref7.styledComponents) ? {
            displayName: Boolean(development)
        } : null,
        removeConsole: nextConfig === null || nextConfig === void 0 ? void 0 : (ref8 = nextConfig.compiler) === null || ref8 === void 0 ? void 0 : ref8.removeConsole,
        // disable "reactRemoveProperties" when "jest" is true
        // otherwise the setting from next.config.js will be used
        reactRemoveProperties: jest ? false : nextConfig === null || nextConfig === void 0 ? void 0 : (ref9 = nextConfig.compiler) === null || ref9 === void 0 ? void 0 : ref9.reactRemoveProperties,
        modularizeImports: nextConfig === null || nextConfig === void 0 ? void 0 : (ref10 = nextConfig.experimental) === null || ref10 === void 0 ? void 0 : ref10.modularizeImports,
        relay: nextConfig === null || nextConfig === void 0 ? void 0 : (ref11 = nextConfig.compiler) === null || ref11 === void 0 ? void 0 : ref11.relay,
        emotion: getEmotionOptions(nextConfig, development)
    };
}
function getEmotionOptions(nextConfig, development) {
    var ref, ref14, ref15, ref16, ref17, ref18, ref19;
    if (!(nextConfig === null || nextConfig === void 0 ? void 0 : (ref = nextConfig.compiler) === null || ref === void 0 ? void 0 : ref.emotion)) {
        return null;
    }
    let autoLabel = false;
    switch(nextConfig === null || nextConfig === void 0 ? void 0 : (ref14 = nextConfig.compiler) === null || ref14 === void 0 ? void 0 : (ref15 = ref14.emotion) === null || ref15 === void 0 ? void 0 : ref15.autoLabel){
        case 'never':
            autoLabel = false;
            break;
        case 'always':
            autoLabel = true;
            break;
        case 'dev-only':
        default:
            autoLabel = !!development;
            break;
    }
    var ref20;
    return {
        enabled: true,
        autoLabel,
        labelFormat: nextConfig === null || nextConfig === void 0 ? void 0 : (ref16 = nextConfig.experimental) === null || ref16 === void 0 ? void 0 : (ref17 = ref16.emotion) === null || ref17 === void 0 ? void 0 : ref17.labelFormat,
        sourcemap: development ? (ref20 = nextConfig === null || nextConfig === void 0 ? void 0 : (ref18 = nextConfig.experimental) === null || ref18 === void 0 ? void 0 : (ref19 = ref18.emotion) === null || ref19 === void 0 ? void 0 : ref19.sourceMap) !== null && ref20 !== void 0 ? ref20 : true : false
    };
}
function getJestSWCOptions({ isServer , filename , esm , nextConfig , jsConfig , pagesDir ,  }) {
    let baseOptions = getBaseSWCOptions({
        filename,
        jest: true,
        development: false,
        hasReactRefresh: false,
        globalWindow: !isServer,
        nextConfig,
        jsConfig
    });
    const isNextDist = nextDistPath.test(filename);
    return {
        ...baseOptions,
        env: {
            targets: {
                // Targets the current version of Node.js
                node: process.versions.node
            }
        },
        module: {
            type: esm && !isNextDist ? 'es6' : 'commonjs'
        },
        disableNextSsg: true,
        disablePageConfig: true,
        pagesDir
    };
}
function getLoaderSWCOptions({ filename , development , isServer , pagesDir , isPageFile , hasReactRefresh , nextConfig , jsConfig , supportedBrowsers ,  }) {
    let baseOptions = getBaseSWCOptions({
        filename,
        development,
        globalWindow: !isServer,
        hasReactRefresh,
        nextConfig,
        jsConfig
    });
    const isNextDist = nextDistPath.test(filename);
    if (isServer) {
        return {
            ...baseOptions,
            // Disables getStaticProps/getServerSideProps tree shaking on the server compilation for pages
            disableNextSsg: true,
            disablePageConfig: true,
            isDevelopment: development,
            isServer,
            pagesDir,
            isPageFile,
            env: {
                targets: {
                    // Targets the current version of Node.js
                    node: process.versions.node
                }
            }
        };
    } else {
        // Matches default @babel/preset-env behavior
        baseOptions.jsc.target = 'es5';
        return {
            ...baseOptions,
            // Ensure Next.js internals are output as commonjs modules
            ...isNextDist ? {
                module: {
                    type: 'commonjs'
                }
            } : {},
            disableNextSsg: !isPageFile,
            isDevelopment: development,
            isServer,
            pagesDir,
            isPageFile,
            ...supportedBrowsers && supportedBrowsers.length > 0 ? {
                env: {
                    targets: supportedBrowsers
                }
            } : {}
        };
    }
}

//# sourceMappingURL=options.js.map