import type { WebNextRequest, WebNextResponse } from './base-http/web'
import type { RenderOpts } from './render'
import type RenderResult from './render-result'
import type { NextParsedUrlQuery } from './request-meta'
import type { Params } from './router'
import type { PayloadOptions } from './send-payload'
import type { LoadComponentsReturnType } from './load-components'

import BaseServer, { Options } from './base-server'
import { renderToHTML } from './render'

interface WebServerConfig {
  loadComponent: (pathname: string) => Promise<LoadComponentsReturnType | null>
  extendRenderOpts?: Partial<BaseServer['renderOpts']>
}

export default class NextWebServer extends BaseServer {
  webServerConfig: WebServerConfig

  constructor(options: Options & { webServerConfig: WebServerConfig }) {
    super(options)
    this.webServerConfig = options.webServerConfig
    Object.assign(this.renderOpts, options.webServerConfig.extendRenderOpts)
  }
  protected generateRewrites() {
    // @TODO: assuming minimal mode right now
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    }
  }
  protected handleCompression() {
    // @TODO
  }
  protected getRoutesManifest() {
    return {
      headers: [],
      rewrites: {
        fallback: [],
        afterFiles: [],
        beforeFiles: [],
      },
      redirects: [],
    }
  }
  protected getPagePath() {
    // @TODO
    return ''
  }
  protected getPublicDir() {
    // @TODO
    return ''
  }
  protected getBuildId() {
    return (globalThis as any).__server_context.buildId
  }
  protected loadEnvConfig() {
    // @TODO
  }
  protected getHasStaticDir() {
    return false
  }
  protected async hasMiddleware() {
    return false
  }
  protected generateImageRoutes() {
    return []
  }
  protected generateStaticRoutes() {
    return []
  }
  protected generateFsStaticRoutes() {
    return []
  }
  protected generatePublicRoutes() {
    return []
  }
  protected getMiddleware() {
    return []
  }
  protected generateCatchAllMiddlewareRoute() {
    return undefined
  }
  protected getFontManifest() {
    return undefined
  }
  protected getMiddlewareManifest() {
    return undefined
  }
  protected getPagesManifest() {
    return {
      [(globalThis as any).__server_context.page]: '',
    }
  }
  protected getFilesystemPaths() {
    return new Set<string>()
  }
  protected getPrerenderManifest() {
    return {
      version: 3 as const,
      routes: {},
      dynamicRoutes: {},
      notFoundRoutes: [],
      preview: {
        previewModeId: '',
        previewModeSigningKey: '',
        previewModeEncryptionKey: '',
      },
    }
  }
  protected getServerComponentManifest() {
    // @TODO: Need to return `extendRenderOpts.serverComponentManifest` here.
    return undefined
  }
  protected async renderHTML(
    req: WebNextRequest,
    _res: WebNextResponse,
    pathname: string,
    query: NextParsedUrlQuery,
    renderOpts: RenderOpts
  ): Promise<RenderResult | null> {
    return renderToHTML(
      {
        url: pathname,
        cookies: req.cookies,
        headers: req.headers,
      } as any,
      {} as any,
      pathname,
      query,
      {
        ...renderOpts,
        // supportsDynamicHTML: true,
        disableOptimizedLoading: true,
        runtime: 'edge',
      }
    )
  }
  protected async sendRenderResult(
    _req: WebNextRequest,
    res: WebNextResponse,
    options: {
      result: RenderResult
      type: 'html' | 'json'
      generateEtags: boolean
      poweredByHeader: boolean
      options?: PayloadOptions | undefined
    }
  ): Promise<void> {
    // Add necessary headers.
    // @TODO: Share the isomorphic logic with server/send-payload.ts.
    if (options.poweredByHeader && options.type === 'html') {
      res.setHeader('X-Powered-By', 'Next.js')
    }
    if (!res.getHeader('Content-Type')) {
      res.setHeader(
        'Content-Type',
        options.type === 'json'
          ? 'application/json'
          : 'text/html; charset=utf-8'
      )
    }

    // @TODO
    const writer = res.transformStream.writable.getWriter()

    if (options.result.isDynamic()) {
      options.result.pipe({
        write: (chunk: Uint8Array) => writer.write(chunk),
        end: () => writer.close(),
        destroy: (err: Error) => writer.abort(err),
        cork: () => {},
        uncork: () => {},
        // Not implemented: on/removeListener
      } as any)
    } else {
      // TODO: generate Etag
      const payload = await options.result.toUnchunkedString()
      res.body(payload)
    }

    res.send()
  }
  protected async runApi() {
    // @TODO
    return true
  }
  protected async findPageComponents(
    pathname: string,
    query?: NextParsedUrlQuery,
    params?: Params | null
  ) {
    const result = await this.webServerConfig.loadComponent(pathname)
    if (!result) return null

    return {
      query: {
        ...(query || {}),
        ...(params || {}),
      },
      components: result,
    }
  }

  public updateRenderOpts(renderOpts: Partial<BaseServer['renderOpts']>) {
    Object.assign(this.renderOpts, renderOpts)
  }
}
