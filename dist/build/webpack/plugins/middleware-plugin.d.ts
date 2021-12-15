import { webpack5 } from 'next/dist/compiled/webpack/webpack';
export declare const ssrEntries: Map<string, {
    requireFlightManifest: boolean;
}>;
export declare const getMiddlewareManifestName: (hasConcurrentFeatures?: boolean) => string;
export declare function mergeMiddlewareManifests(a: MiddlewareManifest, b?: MiddlewareManifest): MiddlewareManifest;
export declare function readMiddlewareManifest(dir: string, hasConcurrentFeatures: boolean): MiddlewareManifest;
export interface MiddlewareManifest {
    version: 1;
    sortedMiddleware: string[];
    clientInfo: [location: string, isSSR: boolean][];
    middleware: {
        [page: string]: {
            env: string[];
            files: string[];
            name: string;
            page: string;
            regexp: string;
        };
    };
}
export default class MiddlewarePlugin {
    dev: boolean;
    webServerRuntime: boolean;
    constructor({ dev, webServerRuntime, }: {
        dev: boolean;
        webServerRuntime: boolean;
    });
    createAssets(compilation: webpack5.Compilation, assets: any, envPerRoute: Map<string, string[]>): void;
    apply(compiler: webpack5.Compiler): void;
}
