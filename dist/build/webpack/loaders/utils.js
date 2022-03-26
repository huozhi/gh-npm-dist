"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.buildExports = buildExports;
exports.isEsmNodeType = void 0;
function buildExports(moduleExports, isESM) {
    let ret = '';
    Object.keys(moduleExports).forEach((key)=>{
        const exportExpression = isESM ? `export ${key === 'default' ? key : `const ${key} =`} ${moduleExports[key]}` : `exports.${key} = ${moduleExports[key]}`;
        ret += exportExpression + '\n';
    });
    return ret;
}
const esmNodeTypes = [
    'ImportDeclaration',
    'ExportDeclaration',
    'ExportNamedDeclaration',
    'ExportDefaultExpression',
    'ExportDefaultDeclaration', 
];
const isEsmNodeType = (type)=>esmNodeTypes.includes(type)
;
exports.isEsmNodeType = isEsmNodeType;

//# sourceMappingURL=utils.js.map