"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = SideEffect;
var _react = _interopRequireWildcard(require("react"));
function SideEffect(props) {
    const { headManager , reduceComponentsToState  } = props;
    function emitChange() {
        if (headManager && headManager.mountedInstances) {
            const headElements = _react.Children.toArray(headManager.mountedInstances).filter(Boolean);
            headManager.updateHead(reduceComponentsToState(headElements, props));
        }
    }
    if (isServer) {
        var ref;
        headManager === null || headManager === void 0 ? void 0 : (ref = headManager.mountedInstances) === null || ref === void 0 ? void 0 : ref.add(props.children);
        emitChange();
    }
    useClientOnlyLayoutEffect(()=>{
        var ref1;
        headManager === null || headManager === void 0 ? void 0 : (ref1 = headManager.mountedInstances) === null || ref1 === void 0 ? void 0 : ref1.add(props.children);
        return ()=>{
            var ref;
            headManager === null || headManager === void 0 ? void 0 : (ref = headManager.mountedInstances) === null || ref === void 0 ? void 0 : ref.delete(props.children);
        };
    });
    // We need to call `updateHead` method whenever the `SideEffect` is trigger in all
    // life-cycles: mount, update, unmount. However, if there are multiple `SideEffect`s
    // being rendered, we only trigger the method from the last one.
    // This is ensured by keeping the last unflushed `updateHead` in the `_pendingUpdate`
    // singleton in the layout effect pass, and actually trigger it in the effect pass.
    useClientOnlyLayoutEffect(()=>{
        if (headManager) {
            headManager._pendingUpdate = emitChange;
        }
        return ()=>{
            if (headManager) {
                headManager._pendingUpdate = emitChange;
            }
        };
    });
    useClientOnlyEffect(()=>{
        if (headManager && headManager._pendingUpdate) {
            headManager._pendingUpdate();
            headManager._pendingUpdate = null;
        }
        return ()=>{
            if (headManager && headManager._pendingUpdate) {
                headManager._pendingUpdate();
                headManager._pendingUpdate = null;
            }
        };
    });
    return null;
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
const isServer = typeof window === 'undefined';
const useClientOnlyLayoutEffect = isServer ? ()=>{} : _react.useLayoutEffect;
const useClientOnlyEffect = isServer ? ()=>{} : _react.useEffect;

//# sourceMappingURL=side-effect.js.map