import type { NextConfig } from '../../../../server/config-shared';
import type { DocumentType } from '../../../../shared/lib/utils';
import type { BuildManifest } from '../../../../server/get-page-files';
import type { ReactLoadableManifest } from '../../../../server/load-components';
import { NextRequest } from '../../../../server/web/spec-extension/request';
export declare function getRender({ dev, page, appMod, pageMod, errorMod, error500Mod, Document, buildManifest, reactLoadableManifest, serverComponentManifest, config, buildId, }: {
    dev: boolean;
    page: string;
    appMod: any;
    pageMod: any;
    errorMod: any;
    error500Mod: any;
    Document: DocumentType;
    buildManifest: BuildManifest;
    reactLoadableManifest: ReactLoadableManifest;
    serverComponentManifest: any | null;
    config: NextConfig;
    buildId: string;
}): (request: NextRequest) => Promise<Response>;
