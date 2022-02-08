import { webpack, sources } from 'next/dist/compiled/webpack/webpack'
import { PAGES_MANIFEST } from '../../../shared/lib/constants'
import getRouteFromEntrypoint from '../../../server/get-route-from-entrypoint'

export type PagesManifest = { [page: string]: string }

// This plugin creates a pages-manifest.json from page entrypoints.
// This is used for mapping paths like `/` to `.next/server/static/<buildid>/pages/index.js` when doing SSR
// It's also used by next export to provide defaultPathMap
export default class PagesManifestPlugin implements webpack.Plugin {
  serverless: boolean
  dev: boolean

  constructor({ serverless, dev }: { serverless: boolean; dev: boolean }) {
    this.serverless = serverless
    this.dev = dev
  }

  createAssets(compilation: any, assets: any) {
    const entrypoints = compilation.entrypoints
    const pages: PagesManifest = {}

    for (const entrypoint of entrypoints.values()) {
      const pagePath = getRouteFromEntrypoint(entrypoint.name)

      if (!pagePath) {
        continue
      }

      const files = entrypoint
        .getFiles()
        .filter(
          (file: string) =>
            !file.includes('webpack-runtime') &&
            !file.includes('webpack-api-runtime') &&
            file.endsWith('.js')
        )

      // Write filename, replace any backslashes in path (on windows) with forwardslashes for cross-platform consistency.
      pages[pagePath] = files[files.length - 1]

      if (!this.dev) {
        pages[pagePath] = pages[pagePath].slice(3)
      }
      pages[pagePath] = pages[pagePath].replace(/\\/g, '/')
    }

    assets[`${!this.dev ? '../' : ''}` + PAGES_MANIFEST] =
      new sources.RawSource(JSON.stringify(pages, null, 2))
  }

  apply(compiler: webpack.Compiler): void {
    compiler.hooks.make.tap('NextJsPagesManifest', (compilation) => {
      // @ts-ignore TODO: Remove ignore when webpack 5 is stable
      compilation.hooks.processAssets.tap(
        {
          name: 'NextJsPagesManifest',
          // @ts-ignore TODO: Remove ignore when webpack 5 is stable
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets: any) => {
          this.createAssets(compilation, assets)
        }
      )
    })
  }
}
