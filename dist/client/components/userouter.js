"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = useRouter;
var _react = _interopRequireDefault(require("react"));
function useRouter(initialUrl) {
    const initialState = {
        url: initialUrl
    };
    const previousUrlRef = _react.default.useRef(initialState);
    const [current, setCurrent] = _react.default.useState(initialState);
    const change = _react.default.useCallback((method, url)=>{
        // @ts-ignore startTransition exists
        _react.default.startTransition(()=>{
            previousUrlRef.current = current;
            const state = _objectSpread({}, current, {
                url
            });
            setCurrent(state);
            // TODO: update url eagerly or not?
            window.history[method](state, '', url);
        });
    }, [
        current
    ]);
    const appRouter = _react.default.useMemo(()=>{
        return {
            // TODO: implement prefetching of loading / flight
            prefetch: ()=>Promise.resolve({})
            ,
            replace: (url)=>{
                return change('replaceState', url);
            },
            push: (url)=>{
                return change('pushState', url);
            },
            url: current.url
        };
    }, [
        current,
        change
    ]);
    return [
        appRouter,
        previousUrlRef,
        current,
        change
    ];
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

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  Object.assign(exports.default, exports);
  module.exports = exports.default;
}

//# sourceMappingURL=userouter.js.map