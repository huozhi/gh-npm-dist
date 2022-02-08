import path from 'path'
import { NextConfigComplete } from '../../server/config-shared'

const EVENT_VERSION = 'NEXT_CLI_SESSION_STARTED'

type EventCliSessionStarted = {
  nextVersion: string
  nodeVersion: string
  cliCommand: string
  isSrcDir: boolean | null
  hasNowJson: boolean
  isCustomServer: boolean | null
  hasNextConfig: boolean
  buildTarget: string
  hasWebpackConfig: boolean
  hasBabelConfig: boolean
  basePathEnabled: boolean
  i18nEnabled: boolean
  imageEnabled: boolean
  locales: string | null
  localeDomainsCount: number | null
  localeDetectionEnabled: boolean | null
  imageDomainsCount: number | null
  imageSizes: string | null
  imageLoader: string | null
  trailingSlashEnabled: boolean
  reactStrictMode: boolean
  webpackVersion: number | null
}

function hasBabelConfig(dir: string): boolean {
  try {
    const noopFile = path.join(dir, 'noop.js')
    const res = require('next/dist/compiled/babel/core').loadPartialConfig({
      cwd: dir,
      filename: noopFile,
      sourceFileName: noopFile,
    }) as any
    const isForTooling =
      res.options?.presets?.every(
        (e: any) => e?.file?.request === 'next/babel'
      ) && res.options?.plugins?.length === 0
    return res.hasFilesystemConfig() && !isForTooling
  } catch {
    return false
  }
}

export function eventCliSession(
  dir: string,
  nextConfig: NextConfigComplete,
  event: Omit<
    EventCliSessionStarted,
    | 'nextVersion'
    | 'nodeVersion'
    | 'hasNextConfig'
    | 'buildTarget'
    | 'hasWebpackConfig'
    | 'hasBabelConfig'
    | 'basePathEnabled'
    | 'i18nEnabled'
    | 'imageEnabled'
    | 'locales'
    | 'localeDomainsCount'
    | 'localeDetectionEnabled'
    | 'imageDomainsCount'
    | 'imageSizes'
    | 'imageLoader'
    | 'trailingSlashEnabled'
    | 'reactStrictMode'
  >
): { eventName: string; payload: EventCliSessionStarted }[] {
  // This should be an invariant, if it fails our build tooling is broken.
  if (typeof process.env.__NEXT_VERSION !== 'string') {
    return []
  }

  const { images, i18n } = nextConfig || {}

  const payload: EventCliSessionStarted = {
    nextVersion: process.env.__NEXT_VERSION,
    nodeVersion: process.version,
    cliCommand: event.cliCommand,
    isSrcDir: event.isSrcDir,
    hasNowJson: event.hasNowJson,
    isCustomServer: event.isCustomServer,
    hasNextConfig: nextConfig.configOrigin !== 'default',
    buildTarget: nextConfig.target === 'server' ? 'default' : nextConfig.target,
    hasWebpackConfig: typeof nextConfig?.webpack === 'function',
    hasBabelConfig: hasBabelConfig(dir),
    imageEnabled: !!images,
    basePathEnabled: !!nextConfig?.basePath,
    i18nEnabled: !!i18n,
    locales: i18n?.locales ? i18n.locales.join(',') : null,
    localeDomainsCount: i18n?.domains ? i18n.domains.length : null,
    localeDetectionEnabled: !i18n ? null : i18n.localeDetection !== false,
    imageDomainsCount: images?.domains ? images.domains.length : null,
    imageSizes: images?.imageSizes ? images.imageSizes.join(',') : null,
    imageLoader: images?.loader,
    trailingSlashEnabled: !!nextConfig?.trailingSlash,
    reactStrictMode: !!nextConfig?.reactStrictMode,
    webpackVersion: event.webpackVersion || null,
  }
  return [{ eventName: EVENT_VERSION, payload }]
}
