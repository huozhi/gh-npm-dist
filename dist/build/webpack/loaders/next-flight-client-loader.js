"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = transformSource;
var _swc = require("../../swc");
async function transformSource(source) {
    const { resourcePath  } = this;
    const transformedSource = source;
    if (typeof transformedSource !== 'string') {
        throw new Error('Expected source to have been transformed to a string.');
    }
    const names = [];
    await parseExportNamesInto(resourcePath, transformedSource, names);
    // next.js/packages/next/<component>.js
    if (/[\\/]next[\\/](link|image)\.js$/.test(resourcePath)) {
        names.push('default');
    }
    let newSrc = "const MODULE_REFERENCE = Symbol.for('react.module.reference');\n";
    for(let i = 0; i < names.length; i++){
        const name = names[i];
        if (name === 'default') {
            newSrc += 'export default ';
        } else {
            newSrc += 'export const ' + name + ' = ';
        }
        newSrc += '{ $$typeof: MODULE_REFERENCE, filepath: ';
        newSrc += JSON.stringify(resourcePath);
        newSrc += ', name: ';
        newSrc += JSON.stringify(name);
        newSrc += '};\n';
    }
    return newSrc;
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
async function parseExportNamesInto(resourcePath, transformedSource, names) {
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
                continue;
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
                continue;
            case 'ExportDeclaration':
                var ref;
                if ((ref = node.declaration) === null || ref === void 0 ? void 0 : ref.identifier) {
                    addExportNames(names, node.declaration.identifier);
                }
                continue;
            default:
                break;
        }
    }
}

//# sourceMappingURL=next-flight-client-loader.js.map