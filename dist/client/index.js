"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.initialize = initialize;
exports.hydrate = hydrate;
exports.emitter = exports.router = exports.version = void 0;
require("../build/polyfills/polyfill-module");
var _react = _interopRequireWildcard(require("react"));
var _reactDom = _interopRequireDefault(require("react-dom"));
var _headManagerContext = require("../shared/lib/head-manager-context");
var _mitt = _interopRequireDefault(require("../shared/lib/mitt"));
var _routerContext = require("../shared/lib/router-context");
var _router = require("../shared/lib/router/router");
var _isDynamic = require("../shared/lib/router/utils/is-dynamic");
var _querystring = require("../shared/lib/router/utils/querystring");
var _runtimeConfig = require("../shared/lib/runtime-config");
var _utils = require("../shared/lib/utils");
var _portal = require("./portal");
var _headManager = _interopRequireDefault(require("./head-manager"));
var _pageLoader = _interopRequireDefault(require("./page-loader"));
var _performanceRelayer = _interopRequireDefault(require("./performance-relayer"));
var _routeAnnouncer = require("./route-announcer");
var _router1 = require("./router");
var _isError = require("../lib/is-error");
var _vitals = require("./streaming/vitals");
var _refresh = require("./streaming/refresh");
var _imageConfigContext = require("../shared/lib/image-config-context");
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _asyncToGenerator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _defineProperty(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
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
function _objectSpread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _defineProperty(target, key, source[key]);
        });
    }
    return target;
}
function _objectWithoutProperties(source, excluded) {
    if (source == null) return {};
    var target = _objectWithoutPropertiesLoose(source, excluded);
    var key, i;
    if (Object.getOwnPropertySymbols) {
        var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
        for(i = 0; i < sourceSymbolKeys.length; i++){
            key = sourceSymbolKeys[i];
            if (excluded.indexOf(key) >= 0) continue;
            if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
            target[key] = source[key];
        }
    }
    return target;
}
function _objectWithoutPropertiesLoose(source, excluded) {
    if (source == null) return {};
    var target = {};
    var sourceKeys = Object.keys(source);
    var key, i;
    for(i = 0; i < sourceKeys.length; i++){
        key = sourceKeys[i];
        if (excluded.indexOf(key) >= 0) continue;
        target[key] = source[key];
    }
    return target;
}
const version = "12.1.1";
exports.version = version;
let router;
exports.router = router;
const emitter = (0, _mitt).default();
exports.emitter = emitter;
const looseToArray = (input)=>[].slice.call(input)
;
let initialData;
let defaultLocale = undefined;
let asPath;
let pageLoader;
let appElement;
let headManager;
let lastRenderReject;
let webpackHMR;
let CachedApp, onPerfEntry;
let CachedComponent;
let isAppRSC;
class Container extends _react.default.Component {
    componentDidCatch(componentErr, info) {
        this.props.fn(componentErr, info);
    }
    componentDidMount() {
        this.scrollToHash();
        // We need to replace the router state if:
        // - the page was (auto) exported and has a query string or search (hash)
        // - it was auto exported and is a dynamic route (to provide params)
        // - if it is a client-side skeleton (fallback render)
        if (router.isSsr && // We don't update for 404 requests as this can modify
        // the asPath unexpectedly e.g. adding basePath when
        // it wasn't originally present
        initialData.page !== '/404' && initialData.page !== '/_error' && (initialData.isFallback || initialData.nextExport && ((0, _isDynamic).isDynamicRoute(router.pathname) || location.search || process.env.__NEXT_HAS_REWRITES) || initialData.props && initialData.props.__N_SSG && (location.search || process.env.__NEXT_HAS_REWRITES))) {
            // update query on mount for exported pages
            router.replace(router.pathname + '?' + String((0, _querystring).assign((0, _querystring).urlQueryToSearchParams(router.query), new URLSearchParams(location.search))), asPath, {
                // @ts-ignore
                // WARNING: `_h` is an internal option for handing Next.js
                // client-side hydration. Your app should _never_ use this property.
                // It may change at any time without notice.
                _h: 1,
                // Fallback pages must trigger the data fetch, so the transition is
                // not shallow.
                // Other pages (strictly updating query) happens shallowly, as data
                // requirements would already be present.
                shallow: !initialData.isFallback
            });
        }
    }
    componentDidUpdate() {
        this.scrollToHash();
    }
    scrollToHash() {
        let { hash  } = location;
        hash = hash && hash.substring(1);
        if (!hash) return;
        const el = document.getElementById(hash);
        if (!el) return;
        // If we call scrollIntoView() in here without a setTimeout
        // it won't scroll properly.
        setTimeout(()=>el.scrollIntoView()
        , 0);
    }
    render() {
        if (process.env.NODE_ENV === 'production') {
            return this.props.children;
        } else {
            const { ReactDevOverlay ,  } = require('next/dist/compiled/@next/react-dev-overlay/client');
            return(/*#__PURE__*/ _react.default.createElement(ReactDevOverlay, null, this.props.children));
        }
    }
}
function initialize() {
    return _initialize.apply(this, arguments);
}
function _initialize() {
    _initialize = _asyncToGenerator(function*(opts = {}) {
        // This makes sure this specific lines are removed in production
        if (process.env.NODE_ENV === 'development') {
            webpackHMR = opts.webpackHMR;
        }
        initialData = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
        window.__NEXT_DATA__ = initialData;
        defaultLocale = initialData.defaultLocale;
        const prefix = initialData.assetPrefix || '';
        // With dynamic assetPrefix it's no longer possible to set assetPrefix at the build time
        // So, this is how we do it in the client side at runtime
        __webpack_public_path__ = `${prefix}/_next/` //eslint-disable-line
        ;
        // Initialize next/config with the environment configuration
        (0, _runtimeConfig).setConfig({
            serverRuntimeConfig: {},
            publicRuntimeConfig: initialData.runtimeConfig || {}
        });
        asPath = (0, _utils).getURL();
        // make sure not to attempt stripping basePath for 404s
        if ((0, _router).hasBasePath(asPath)) {
            asPath = (0, _router).delBasePath(asPath);
        }
        if (process.env.__NEXT_I18N_SUPPORT) {
            const { normalizeLocalePath  } = require('../shared/lib/i18n/normalize-locale-path');
            const { detectDomainLocale  } = require('../shared/lib/i18n/detect-domain-locale');
            const { parseRelativeUrl  } = require('../shared/lib/router/utils/parse-relative-url');
            const { formatUrl  } = require('../shared/lib/router/utils/format-url');
            if (initialData.locales) {
                const parsedAs = parseRelativeUrl(asPath);
                const localePathResult = normalizeLocalePath(parsedAs.pathname, initialData.locales);
                if (localePathResult.detectedLocale) {
                    parsedAs.pathname = localePathResult.pathname;
                    asPath = formatUrl(parsedAs);
                } else {
                    // derive the default locale if it wasn't detected in the asPath
                    // since we don't prerender static pages with all possible default
                    // locales
                    defaultLocale = initialData.locale;
                }
                // attempt detecting default locale based on hostname
                const detectedDomain = detectDomainLocale(process.env.__NEXT_I18N_DOMAINS, window.location.hostname);
                // TODO: investigate if defaultLocale needs to be populated after
                // hydration to prevent mismatched renders
                if (detectedDomain) {
                    defaultLocale = detectedDomain.defaultLocale;
                }
            }
        }
        if (initialData.scriptLoader) {
            const { initScriptLoader  } = require('./script');
            initScriptLoader(initialData.scriptLoader);
        }
        pageLoader = new _pageLoader.default(initialData.buildId, prefix);
        const register = ([r, f])=>pageLoader.routeLoader.onEntrypoint(r, f)
        ;
        if (window.__NEXT_P) {
            // Defer page registration for another tick. This will increase the overall
            // latency in hydrating the page, but reduce the total blocking time.
            window.__NEXT_P.map((p)=>setTimeout(()=>register(p)
                , 0)
            );
        }
        window.__NEXT_P = [];
        window.__NEXT_P.push = register;
        headManager = (0, _headManager).default();
        headManager.getIsSsr = ()=>{
            return router.isSsr;
        };
        appElement = document.getElementById('__next');
        return {
            assetPrefix: prefix
        };
    });
    return _initialize.apply(this, arguments);
}
function hydrate(opts) {
    return _hydrate.apply(this, arguments);
}
function _hydrate() {
    _hydrate = _asyncToGenerator(function*(opts) {
        let initialErr = initialData.err;
        try {
            const appEntrypoint = yield pageLoader.routeLoader.whenEntrypoint('/_app');
            if ('error' in appEntrypoint) {
                throw appEntrypoint.error;
            }
            const { component: app , exports: mod  } = appEntrypoint;
            CachedApp = app;
            isAppRSC = !!mod.__next_rsc__;
            const exportedReportWebVitals = mod && mod.reportWebVitals;
            onPerfEntry = ({ id , name , startTime , value , duration , entryType , entries  })=>{
                // Combines timestamp with random number for unique ID
                const uniqueID = `${Date.now()}-${Math.floor(Math.random() * (9000000000000 - 1)) + 1000000000000}`;
                let perfStartEntry;
                if (entries && entries.length) {
                    perfStartEntry = entries[0].startTime;
                }
                const webVitals = {
                    id: id || uniqueID,
                    name,
                    startTime: startTime || perfStartEntry,
                    value: value == null ? duration : value,
                    label: entryType === 'mark' || entryType === 'measure' ? 'custom' : 'web-vital'
                };
                exportedReportWebVitals === null || exportedReportWebVitals === void 0 ? void 0 : exportedReportWebVitals(webVitals);
                (0, _vitals).trackWebVitalMetric(webVitals);
            };
            const pageEntrypoint = // The dev server fails to serve script assets when there's a hydration
            // error, so we need to skip waiting for the entrypoint.
            process.env.NODE_ENV === 'development' && initialData.err ? {
                error: initialData.err
            } : yield pageLoader.routeLoader.whenEntrypoint(initialData.page);
            if ('error' in pageEntrypoint) {
                throw pageEntrypoint.error;
            }
            CachedComponent = pageEntrypoint.component;
            if (process.env.NODE_ENV !== 'production') {
                const { isValidElementType  } = require('next/dist/compiled/react-is');
                if (!isValidElementType(CachedComponent)) {
                    throw new Error(`The default export is not a React Component in page: "${initialData.page}"`);
                }
            }
        } catch (error1) {
            // This catches errors like throwing in the top level of a module
            initialErr = (0, _isError).getProperError(error1);
        }
        if (process.env.NODE_ENV === 'development') {
            const { getNodeError ,  } = require('next/dist/compiled/@next/react-dev-overlay/client');
            // Server-side runtime errors need to be re-thrown on the client-side so
            // that the overlay is rendered.
            if (initialErr) {
                if (initialErr === initialData.err) {
                    setTimeout(()=>{
                        let error;
                        try {
                            // Generate a new error object. We `throw` it because some browsers
                            // will set the `stack` when thrown, and we want to ensure ours is
                            // not overridden when we re-throw it below.
                            throw new Error(initialErr.message);
                        } catch (e) {
                            error = e;
                        }
                        error.name = initialErr.name;
                        error.stack = initialErr.stack;
                        // Errors from the middleware are reported as client-side errors
                        // since the middleware is compiled using the client compiler
                        if (initialData.err && 'middleware' in initialData.err) {
                            throw error;
                        }
                        const node = getNodeError(error);
                        throw node;
                    });
                } else {
                    setTimeout(()=>{
                        throw initialErr;
                    });
                }
            }
        }
        if (window.__NEXT_PRELOADREADY) {
            yield window.__NEXT_PRELOADREADY(initialData.dynamicIds);
        }
        exports.router = router = (0, _router1).createRouter(initialData.page, initialData.query, asPath, {
            initialProps: initialData.props,
            pageLoader,
            App: CachedApp,
            Component: CachedComponent,
            wrapApp,
            err: initialErr,
            isFallback: Boolean(initialData.isFallback),
            subscription: (info, App, scroll)=>render(Object.assign({}, info, {
                    App,
                    scroll
                }))
            ,
            locale: initialData.locale,
            locales: initialData.locales,
            defaultLocale,
            domainLocales: initialData.domainLocales,
            isPreview: initialData.isPreview,
            isRsc: initialData.rsc
        });
        const renderCtx = {
            App: CachedApp,
            initial: true,
            Component: CachedComponent,
            props: initialData.props,
            err: initialErr
        };
        if (opts === null || opts === void 0 ? void 0 : opts.beforeRender) {
            yield opts.beforeRender();
        }
        render(renderCtx);
    });
    return _hydrate.apply(this, arguments);
}
function render(renderingProps) {
    return _render.apply(this, arguments);
}
function _render() {
    _render = _asyncToGenerator(function*(renderingProps) {
        if (renderingProps.err) {
            yield renderError(renderingProps);
            return;
        }
        try {
            yield doRender(renderingProps);
        } catch (err) {
            const renderErr = (0, _isError).getProperError(err);
            // bubble up cancelation errors
            if (renderErr.cancelled) {
                throw renderErr;
            }
            if (process.env.NODE_ENV === 'development') {
                // Ensure this error is displayed in the overlay in development
                setTimeout(()=>{
                    throw renderErr;
                });
            }
            yield renderError(_objectSpread({}, renderingProps, {
                err: renderErr
            }));
        }
    });
    return _render.apply(this, arguments);
}
// This method handles all runtime and debug errors.
// 404 and 500 errors are special kind of errors
// and they are still handle via the main render method.
function renderError(renderErrorProps) {
    const { App , err  } = renderErrorProps;
    // In development runtime errors are caught by our overlay
    // In production we catch runtime errors using componentDidCatch which will trigger renderError
    if (process.env.NODE_ENV !== 'production') {
        // A Next.js rendering runtime error is always unrecoverable
        // FIXME: let's make this recoverable (error in GIP client-transition)
        webpackHMR.onUnrecoverableError();
        // We need to render an empty <App> so that the `<ReactDevOverlay>` can
        // render itself.
        return doRender({
            App: ()=>null
            ,
            props: {},
            Component: ()=>null
            ,
            styleSheets: []
        });
    }
    // Make sure we log the error to the console, otherwise users can't track down issues.
    console.error(err);
    console.error(`A client-side exception has occurred, see here for more info: https://nextjs.org/docs/messages/client-side-exception-occurred`);
    return pageLoader.loadPage('/_error').then(({ page: ErrorComponent , styleSheets  })=>{
        return (lastAppProps === null || lastAppProps === void 0 ? void 0 : lastAppProps.Component) === ErrorComponent ? import('../pages/_error').then((m)=>({
                ErrorComponent: m.default,
                styleSheets: []
            })
        ) : {
            ErrorComponent,
            styleSheets
        };
    }).then(({ ErrorComponent , styleSheets  })=>{
        // In production we do a normal render with the `ErrorComponent` as component.
        // If we've gotten here upon initial render, we can use the props from the server.
        // Otherwise, we need to call `getInitialProps` on `App` before mounting.
        const AppTree = wrapApp(App);
        const appCtx = {
            Component: ErrorComponent,
            AppTree,
            router,
            ctx: {
                err,
                pathname: initialData.page,
                query: initialData.query,
                asPath,
                AppTree
            }
        };
        return Promise.resolve(renderErrorProps.props ? renderErrorProps.props : (0, _utils).loadGetInitialProps(App, appCtx)).then((initProps)=>doRender(_objectSpread({}, renderErrorProps, {
                err,
                Component: ErrorComponent,
                styleSheets,
                props: initProps
            }))
        );
    });
}
let reactRoot = null;
// On initial render a hydrate should always happen
let shouldHydrate = true;
function renderReactElement(domEl, fn) {
    // mark start of hydrate/render
    if (_utils.ST) {
        performance.mark('beforeRender');
    }
    const reactEl = fn(shouldHydrate ? markHydrateComplete : markRenderComplete);
    if (process.env.__NEXT_REACT_ROOT) {
        const ReactDOMClient = require('react-dom/client');
        if (!reactRoot) {
            // Unlike with createRoot, you don't need a separate root.render() call here
            reactRoot = ReactDOMClient.hydrateRoot(domEl, reactEl);
            // TODO: Remove shouldHydrate variable when React 18 is stable as it can depend on `reactRoot` existing
            shouldHydrate = false;
        } else {
            reactRoot.render(reactEl);
        }
    } else {
        // The check for `.hydrate` is there to support React alternatives like preact
        if (shouldHydrate) {
            _reactDom.default.hydrate(reactEl, domEl);
            shouldHydrate = false;
        } else {
            _reactDom.default.render(reactEl, domEl);
        }
    }
}
function markHydrateComplete() {
    if (!_utils.ST) return;
    performance.mark('afterHydrate') // mark end of hydration
    ;
    performance.measure('Next.js-before-hydration', 'navigationStart', 'beforeRender');
    performance.measure('Next.js-hydration', 'beforeRender', 'afterHydrate');
    if (onPerfEntry) {
        performance.getEntriesByName('Next.js-hydration').forEach(onPerfEntry);
    }
    clearMarks();
}
function markRenderComplete() {
    if (!_utils.ST) return;
    performance.mark('afterRender') // mark end of render
    ;
    const navStartEntries = performance.getEntriesByName('routeChange', 'mark');
    if (!navStartEntries.length) return;
    performance.measure('Next.js-route-change-to-render', navStartEntries[0].name, 'beforeRender');
    performance.measure('Next.js-render', 'beforeRender', 'afterRender');
    if (onPerfEntry) {
        performance.getEntriesByName('Next.js-render').forEach(onPerfEntry);
        performance.getEntriesByName('Next.js-route-change-to-render').forEach(onPerfEntry);
    }
    clearMarks();
    [
        'Next.js-route-change-to-render',
        'Next.js-render'
    ].forEach((measure)=>performance.clearMeasures(measure)
    );
}
function clearMarks() {
    [
        'beforeRender',
        'afterHydrate',
        'afterRender',
        'routeChange'
    ].forEach((mark)=>performance.clearMarks(mark)
    );
}
function AppContainer({ children  }) {
    return(/*#__PURE__*/ _react.default.createElement(Container, {
        fn: (error)=>renderError({
                App: CachedApp,
                err: error
            }).catch((err)=>console.error('Error rendering page: ', err)
            )
    }, /*#__PURE__*/ _react.default.createElement(_routerContext.RouterContext.Provider, {
        value: (0, _router1).makePublicRouterInstance(router)
    }, /*#__PURE__*/ _react.default.createElement(_headManagerContext.HeadManagerContext.Provider, {
        value: headManager
    }, /*#__PURE__*/ _react.default.createElement(_imageConfigContext.ImageConfigContext.Provider, {
        value: process.env.__NEXT_IMAGE_OPTS
    }, children)))));
}
function renderApp(App, appProps) {
    if (process.env.__NEXT_RSC && isAppRSC) {
        const { Component , err: _ , router: __  } = appProps, props = _objectWithoutProperties(appProps, [
            "Component",
            "err",
            "router"
        ]);
        return(/*#__PURE__*/ _react.default.createElement(Component, Object.assign({}, props)));
    } else {
        return(/*#__PURE__*/ _react.default.createElement(App, Object.assign({}, appProps)));
    }
}
const wrapApp = (App)=>(wrappedAppProps)=>{
        const appProps = _objectSpread({}, wrappedAppProps, {
            Component: CachedComponent,
            err: initialData.err,
            router
        });
        return(/*#__PURE__*/ _react.default.createElement(AppContainer, null, renderApp(App, appProps)));
    }
;
let RSCComponent;
if (process.env.__NEXT_RSC) {
    const getCacheKey = ()=>{
        const { pathname , search  } = location;
        return pathname + search;
    };
    const { createFromFetch ,  } = require('next/dist/compiled/react-server-dom-webpack');
    const encoder = new TextEncoder();
    let initialServerDataBuffer = undefined;
    let initialServerDataWriter = undefined;
    let initialServerDataLoaded = false;
    let initialServerDataFlushed = false;
    function nextServerDataCallback(seg) {
        if (seg[0] === 0) {
            initialServerDataBuffer = [];
        } else {
            if (!initialServerDataBuffer) throw new Error('Unexpected server data: missing bootstrap script.');
            if (initialServerDataWriter) {
                initialServerDataWriter.write(encoder.encode(seg[2]));
            } else {
                initialServerDataBuffer.push(seg[2]);
            }
        }
    }
    // There might be race conditions between `nextServerDataRegisterWriter` and
    // `DOMContentLoaded`. The former will be called when React starts to hydrate
    // the root, the latter will be called when the DOM is fully loaded.
    // For streaming, the former is called first due to partial hydration.
    // For non-streaming, the latter can be called first.
    // Hence, we use two variables `initialServerDataLoaded` and
    // `initialServerDataFlushed` to make sure the writer will be closed and
    // `initialServerDataBuffer` will be cleared in the right time.
    function nextServerDataRegisterWriter(writer) {
        if (initialServerDataBuffer) {
            initialServerDataBuffer.forEach((val)=>{
                writer.write(encoder.encode(val));
            });
            if (initialServerDataLoaded && !initialServerDataFlushed) {
                writer.close();
                initialServerDataFlushed = true;
                initialServerDataBuffer = undefined;
            }
        }
        initialServerDataWriter = writer;
    }
    // When `DOMContentLoaded`, we can close all pending writers to finish hydration.
    const DOMContentLoaded = function() {
        if (initialServerDataWriter && !initialServerDataFlushed) {
            initialServerDataWriter.close();
            initialServerDataFlushed = true;
            initialServerDataBuffer = undefined;
        }
        initialServerDataLoaded = true;
    };
    // It's possible that the DOM is already loaded.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', DOMContentLoaded, false);
    } else {
        DOMContentLoaded();
    }
    const nextServerDataLoadingGlobal = self.__next_s = self.__next_s || [];
    nextServerDataLoadingGlobal.forEach(nextServerDataCallback);
    nextServerDataLoadingGlobal.push = nextServerDataCallback;
    function createResponseCache() {
        return new Map();
    }
    const rscCache = createResponseCache();
    function fetchFlight(href, props) {
        const url = new URL(href, location.origin);
        const searchParams = url.searchParams;
        searchParams.append('__flight__', '1');
        if (props) {
            searchParams.append('__props__', JSON.stringify(props));
        }
        return fetch(url.toString());
    }
    function useServerResponse(cacheKey, serialized) {
        let response = rscCache.get(cacheKey);
        if (response) return response;
        if (initialServerDataBuffer) {
            const t = new TransformStream();
            const writer = t.writable.getWriter();
            response = createFromFetch(Promise.resolve({
                body: t.readable
            }));
            nextServerDataRegisterWriter(writer);
        } else {
            const fetchPromise = serialized ? (()=>{
                const t = new TransformStream();
                const writer = t.writable.getWriter();
                writer.ready.then(()=>{
                    writer.write(new TextEncoder().encode(serialized));
                });
                return Promise.resolve({
                    body: t.readable
                });
            })() : fetchFlight(getCacheKey());
            response = createFromFetch(fetchPromise);
        }
        rscCache.set(cacheKey, response);
        return response;
    }
    const ServerRoot = ({ cacheKey , serialized  })=>{
        _react.default.useEffect(()=>{
            rscCache.delete(cacheKey);
        });
        const response = useServerResponse(cacheKey, serialized);
        const root = response.readRoot();
        return root;
    };
    RSCComponent = (props)=>{
        const cacheKey = getCacheKey();
        const { __flight_serialized__  } = props;
        const [, dispatch] = (0, _react).useState({});
        const startTransition = _react.default.startTransition;
        const rerender = ()=>dispatch({})
        ;
        // If there is no cache, or there is serialized data already
        function refreshCache(nextProps) {
            startTransition(()=>{
                const currentCacheKey = getCacheKey();
                const response = createFromFetch(fetchFlight(currentCacheKey, nextProps));
                rscCache.set(currentCacheKey, response);
                rerender();
            });
        }
        return(/*#__PURE__*/ _react.default.createElement(_refresh.RefreshContext.Provider, {
            value: refreshCache
        }, /*#__PURE__*/ _react.default.createElement(ServerRoot, {
            cacheKey: cacheKey,
            serialized: __flight_serialized__
        })));
    };
}
let lastAppProps;
function doRender(input) {
    let { App , Component , props , err , __N_RSC  } = input;
    let styleSheets = 'initial' in input ? undefined : input.styleSheets;
    Component = Component || lastAppProps.Component;
    props = props || lastAppProps.props;
    const isRSC = process.env.__NEXT_RSC && 'initial' in input ? !!initialData.rsc : !!__N_RSC;
    const appProps = _objectSpread({}, props, {
        Component: isRSC ? RSCComponent : Component,
        err,
        router
    });
    // lastAppProps has to be set before ReactDom.render to account for ReactDom throwing an error.
    lastAppProps = appProps;
    let canceled = false;
    let resolvePromise;
    const renderPromise = new Promise((resolve, reject)=>{
        if (lastRenderReject) {
            lastRenderReject();
        }
        resolvePromise = ()=>{
            lastRenderReject = null;
            resolve();
        };
        lastRenderReject = ()=>{
            canceled = true;
            lastRenderReject = null;
            const error = new Error('Cancel rendering route');
            error.cancelled = true;
            reject(error);
        };
    });
    // This function has a return type to ensure it doesn't start returning a
    // Promise. It should remain synchronous.
    function onStart() {
        if (!styleSheets || // We use `style-loader` in development, so we don't need to do anything
        // unless we're in production:
        process.env.NODE_ENV !== 'production') {
            return false;
        }
        const currentStyleTags = looseToArray(document.querySelectorAll('style[data-n-href]'));
        const currentHrefs = new Set(currentStyleTags.map((tag)=>tag.getAttribute('data-n-href')
        ));
        const noscript = document.querySelector('noscript[data-n-css]');
        const nonce = noscript === null || noscript === void 0 ? void 0 : noscript.getAttribute('data-n-css');
        styleSheets.forEach(({ href , text  })=>{
            if (!currentHrefs.has(href)) {
                const styleTag = document.createElement('style');
                styleTag.setAttribute('data-n-href', href);
                styleTag.setAttribute('media', 'x');
                if (nonce) {
                    styleTag.setAttribute('nonce', nonce);
                }
                document.head.appendChild(styleTag);
                styleTag.appendChild(document.createTextNode(text));
            }
        });
        return true;
    }
    function onHeadCommit() {
        if (// We use `style-loader` in development, so we don't need to do anything
        // unless we're in production:
        process.env.NODE_ENV === 'production' && // We can skip this during hydration. Running it wont cause any harm, but
        // we may as well save the CPU cycles:
        styleSheets && // Ensure this render was not canceled
        !canceled) {
            const desiredHrefs = new Set(styleSheets.map((s)=>s.href
            ));
            const currentStyleTags = looseToArray(document.querySelectorAll('style[data-n-href]'));
            const currentHrefs = currentStyleTags.map((tag)=>tag.getAttribute('data-n-href')
            );
            // Toggle `<style>` tags on or off depending on if they're needed:
            for(let idx = 0; idx < currentHrefs.length; ++idx){
                if (desiredHrefs.has(currentHrefs[idx])) {
                    currentStyleTags[idx].removeAttribute('media');
                } else {
                    currentStyleTags[idx].setAttribute('media', 'x');
                }
            }
            // Reorder styles into intended order:
            let referenceNode = document.querySelector('noscript[data-n-css]');
            if (// This should be an invariant:
            referenceNode) {
                styleSheets.forEach(({ href  })=>{
                    const targetTag = document.querySelector(`style[data-n-href="${href}"]`);
                    if (// This should be an invariant:
                    targetTag) {
                        referenceNode.parentNode.insertBefore(targetTag, referenceNode.nextSibling);
                        referenceNode = targetTag;
                    }
                });
            }
            // Finally, clean up server rendered stylesheets:
            looseToArray(document.querySelectorAll('link[data-n-p]')).forEach((el)=>{
                el.parentNode.removeChild(el);
            });
        }
        if (input.scroll) {
            window.scrollTo(input.scroll.x, input.scroll.y);
        }
    }
    function onRootCommit() {
        resolvePromise();
    }
    onStart();
    const elem = /*#__PURE__*/ _react.default.createElement(_react.default.Fragment, null, /*#__PURE__*/ _react.default.createElement(Head, {
        callback: onHeadCommit
    }), /*#__PURE__*/ _react.default.createElement(AppContainer, null, renderApp(App, appProps), /*#__PURE__*/ _react.default.createElement(_portal.Portal, {
        type: "next-route-announcer"
    }, /*#__PURE__*/ _react.default.createElement(_routeAnnouncer.RouteAnnouncer, null))));
    // We catch runtime errors using componentDidCatch which will trigger renderError
    renderReactElement(appElement, (callback)=>/*#__PURE__*/ _react.default.createElement(Root, {
            callbacks: [
                callback,
                onRootCommit
            ]
        }, process.env.__NEXT_STRICT_MODE ? /*#__PURE__*/ _react.default.createElement(_react.default.StrictMode, null, elem) : elem)
    );
    return renderPromise;
}
function Root({ callbacks , children  }) {
    // We use `useLayoutEffect` to guarantee the callbacks are executed
    // as soon as React flushes the update
    _react.default.useLayoutEffect(()=>callbacks.forEach((callback)=>callback()
        )
    , [
        callbacks
    ]);
    if (process.env.__NEXT_TEST_MODE) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        _react.default.useEffect(()=>{
            window.__NEXT_HYDRATED = true;
            if (window.__NEXT_HYDRATED_CB) {
                window.__NEXT_HYDRATED_CB();
            }
        }, []);
    }
    // We should ask to measure the Web Vitals after rendering completes so we
    // don't cause any hydration delay:
    _react.default.useEffect(()=>{
        (0, _performanceRelayer).default(onPerfEntry);
        (0, _vitals).flushBufferedVitalsMetrics();
    }, []);
    return children;
}
// Dummy component that we render as a child of Root so that we can
// toggle the correct styles before the page is rendered.
function Head({ callback  }) {
    // We use `useLayoutEffect` to guarantee the callback is executed
    // as soon as React flushes the update.
    _react.default.useLayoutEffect(()=>callback()
    , [
        callback
    ]);
    return null;
}

//# sourceMappingURL=index.js.map