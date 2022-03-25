"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = transformSource;
var _swc = require("../../swc");
var _utils = require("./utils");
async function transformSource(source) {
    const { resourcePath  } = this;
    const transformedSource = source;
    if (typeof transformedSource !== 'string') {
        throw new Error('Expected source to have been transformed to a string.');
    }
    const names = [];
    await parseModuleInfo(resourcePath, transformedSource, names);
    // next.js/packages/next/<component>.js
    if (/[\\/]next[\\/](link|image)\.js$/.test(resourcePath)) {
        names.push('default');
    }
    const moduleRefDef = "const MODULE_REFERENCE = Symbol.for('react.module.reference');\n";
    const clientRefsExports = names.reduce((res, name)=>{
        const moduleRef = '{ $$typeof: MODULE_REFERENCE, filepath: ' + JSON.stringify(resourcePath) + ', name: ' + JSON.stringify(name) + ' };\n';
        res[name] = moduleRef;
        return res;
    }, {});
    // still generate module references in ESM
    const output = moduleRefDef + (0, _utils).buildExports(clientRefsExports, true);
    return output;
}
function addExportNames(names, node) {
    switch(node.type){
        case 'Identifier':
            names.push(node.value);
            return;
        case 'ObjectPattern':
            for(let i = 0; i < node.properties.length; i++)addExportNames(names, node.properties[i]);
            return;
        case 'ArrayPattern':
            for(let i1 = 0; i1 < node.elements.length; i1++){
                const element = node.elements[i1];
                if (element) addExportNames(names, element);
            }
            return;
        case 'Property':
            addExportNames(names, node.value);
            return;
        case 'AssignmentPattern':
            addExportNames(names, node.left);
            return;
        case 'RestElement':
            addExportNames(names, node.argument);
            return;
        case 'ParenthesizedExpression':
            addExportNames(names, node.expression);
            return;
        default:
            return;
    }
}
async function parseModuleInfo(resourcePath, transformedSource, names) {
    const { body  } = await (0, _swc).parse(transformedSource, {
        filename: resourcePath,
        isModule: true
    });
    for(let i = 0; i < body.length; i++){
        const node = body[i];
        switch(node.type){
            // TODO: support export * from module path
            // case 'ExportAllDeclaration':
            case 'ExportDefaultExpression':
            case 'ExportDefaultDeclaration':
                names.push('default');
                break;
            case 'ExportNamedDeclaration':
                if (node.declaration) {
                    if (node.declaration.type === 'VariableDeclaration') {
                        const declarations = node.declaration.declarations;
                        for(let j = 0; j < declarations.length; j++){
                            addExportNames(names, declarations[j].id);
                        }
                    } else {
                        addExportNames(names, node.declaration.id);
                    }
                }
                if (node.specificers) {
                    const specificers = node.specificers;
                    for(let j = 0; j < specificers.length; j++){
                        addExportNames(names, specificers[j].exported);
                    }
                }
                break;
            case 'ExportDeclaration':
                var ref;
                if ((ref = node.declaration) === null || ref === void 0 ? void 0 : ref.identifier) {
                    addExportNames(names, node.declaration.identifier);
                }
                break;
            case 'ExpressionStatement':
                {
                    var ref1;
                    const { expression: { left  } ,  } = node;
                    // exports.xxx = xxx
                    if (left.type === 'MemberExpression' && (left === null || left === void 0 ? void 0 : left.object.type) === 'Identifier' && ((ref1 = left.object) === null || ref1 === void 0 ? void 0 : ref1.value) === 'exports') {
                        addExportNames(names, left.property);
                    }
                    break;
                }
            default:
                break;
        }
    }
}

//# sourceMappingURL=next-flight-client-loader.js.map