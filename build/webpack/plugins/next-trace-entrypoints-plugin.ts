import nodePath from 'path'
import { Span } from '../../../trace'
import { spans } from './profiling-plugin'
import isError from '../../../lib/is-error'
import {
  nodeFileTrace,
  NodeFileTraceReasons,
} from 'next/dist/compiled/@vercel/nft'
import { TRACE_OUTPUT_VERSION } from '../../../shared/lib/constants'
import { webpack, sources } from 'next/dist/compiled/webpack/webpack'
import type { webpack5 } from 'next/dist/compiled/webpack/webpack'
import {
  NODE_ESM_RESOLVE_OPTIONS,
  NODE_RESOLVE_OPTIONS,
  resolveExternal,
} from '../../webpack-config'
import { NextConfigComplete } from '../../../server/config-shared'

const PLUGIN_NAME = 'TraceEntryPointsPlugin'
const TRACE_IGNORES = [
  '**/*/next/dist/server/next.js',
  '**/*/next/dist/bin/next',
]

function getModuleFromDependency(
  compilation: any,
  dep: any
): webpack5.Module & { resource?: string } {
  return compilation.moduleGraph.getModule(dep)
}

function getFilesMapFromReasons(
  fileList: Set<string>,
  reasons: NodeFileTraceReasons,
  ignoreFn?: (file: string, parent?: string) => Boolean
) {
  // this uses the reasons tree to collect files specific to a
  // certain parent allowing us to not have to trace each parent
  // separately
  const parentFilesMap = new Map<string, Set<string>>()

  function propagateToParents(
    parents: Set<string>,
    file: string,
    seen = new Set<string>()
  ) {
    for (const parent of parents || []) {
      if (!seen.has(parent)) {
        seen.add(parent)
        let parentFiles = parentFilesMap.get(parent)

        if (!parentFiles) {
          parentFiles = new Set()
          parentFilesMap.set(parent, parentFiles)
        }

        if (!ignoreFn?.(file, parent)) {
          parentFiles.add(file)
        }
        const parentReason = reasons.get(parent)

        if (parentReason?.parents) {
          propagateToParents(parentReason.parents, file, seen)
        }
      }
    }
  }

  for (const file of fileList!) {
    const reason = reasons!.get(file)

    if (
      !reason ||
      !reason.parents ||
      (reason.type === 'initial' && reason.parents.size === 0)
    ) {
      continue
    }
    propagateToParents(reason.parents, file)
  }
  return parentFilesMap
}

export class TraceEntryPointsPlugin implements webpack5.WebpackPluginInstance {
  private appDir: string
  private tracingRoot: string
  private entryTraces: Map<string, Set<string>>
  private excludeFiles: string[]
  private esmExternals?: NextConfigComplete['experimental']['esmExternals']
  private staticImageImports?: boolean

  constructor({
    appDir,
    excludeFiles,
    esmExternals,
    staticImageImports,
    outputFileTracingRoot,
  }: {
    appDir: string
    excludeFiles?: string[]
    staticImageImports: boolean
    outputFileTracingRoot?: string
    esmExternals?: NextConfigComplete['experimental']['esmExternals']
  }) {
    this.appDir = appDir
    this.entryTraces = new Map()
    this.esmExternals = esmExternals
    this.excludeFiles = excludeFiles || []
    this.staticImageImports = staticImageImports
    this.tracingRoot = outputFileTracingRoot || appDir
  }

  // Here we output all traced assets and webpack chunks to a
  // ${page}.js.nft.json file
  async createTraceAssets(
    compilation: any,
    assets: any,
    span: Span,
    readlink: any,
    stat: any
  ) {
    const outputPath = compilation.outputOptions.path

    await span.traceChild('create-trace-assets').traceAsyncFn(async () => {
      const entryFilesMap = new Map<any, Set<string>>()
      const chunksToTrace = new Set<string>()

      for (const entrypoint of compilation.entrypoints.values()) {
        const entryFiles = new Set<string>()

        for (const chunk of entrypoint
          .getEntrypointChunk()
          .getAllReferencedChunks()) {
          for (const file of chunk.files) {
            const filePath = nodePath.join(outputPath, file)
            chunksToTrace.add(filePath)
            entryFiles.add(filePath)
          }
          for (const file of chunk.auxiliaryFiles) {
            const filePath = nodePath.join(outputPath, file)
            chunksToTrace.add(filePath)
            entryFiles.add(filePath)
          }
        }
        entryFilesMap.set(entrypoint, entryFiles)
      }

      const result = await nodeFileTrace([...chunksToTrace], {
        base: this.tracingRoot,
        processCwd: this.appDir,
        readFile: async (path) => {
          if (chunksToTrace.has(path)) {
            const source =
              assets[
                nodePath.relative(outputPath, path).replace(/\\/g, '/')
              ]?.source?.()
            if (source) return source
          }
          try {
            return await new Promise((resolve, reject) => {
              ;(
                compilation.inputFileSystem
                  .readFile as typeof import('fs').readFile
              )(path, (err, data) => {
                if (err) return reject(err)
                resolve(data)
              })
            })
          } catch (e) {
            if (isError(e) && (e.code === 'ENOENT' || e.code === 'EISDIR')) {
              return null
            }
            throw e
          }
        },
        readlink,
        stat,
        ignore: [...TRACE_IGNORES, ...this.excludeFiles],
        mixedModules: true,
      })
      const reasons = result.reasons
      const fileList = result.fileList
      result.esmFileList.forEach((file) => fileList.add(file))

      const parentFilesMap = getFilesMapFromReasons(fileList, reasons)

      for (const [entrypoint, entryFiles] of entryFilesMap) {
        const traceOutputName = `../${entrypoint.name}.js.nft.json`
        const traceOutputPath = nodePath.dirname(
          nodePath.join(outputPath, traceOutputName)
        )
        const allEntryFiles = new Set<string>()

        entryFiles.forEach((file) => {
          parentFilesMap
            .get(nodePath.relative(this.tracingRoot, file))
            ?.forEach((child) => {
              allEntryFiles.add(nodePath.join(this.tracingRoot, child))
            })
        })
        // don't include the entry itself in the trace
        entryFiles.delete(nodePath.join(outputPath, `../${entrypoint.name}.js`))

        assets[traceOutputName] = new sources.RawSource(
          JSON.stringify({
            version: TRACE_OUTPUT_VERSION,
            files: [
              ...new Set([
                ...entryFiles,
                ...allEntryFiles,
                ...(this.entryTraces.get(entrypoint.name) || []),
              ]),
            ].map((file) => {
              return nodePath
                .relative(traceOutputPath, file)
                .replace(/\\/g, '/')
            }),
          })
        )
      }
    })
  }

  tapfinishModules(
    compilation: webpack5.Compilation,
    traceEntrypointsPluginSpan: Span,
    doResolve: (
      request: string,
      parent: string,
      job: import('@vercel/nft/out/node-file-trace').Job,
      isEsmRequested: boolean
    ) => Promise<string>,
    readlink: any,
    stat: any
  ) {
    compilation.hooks.finishModules.tapAsync(
      PLUGIN_NAME,
      async (_stats: any, callback: any) => {
        const finishModulesSpan =
          traceEntrypointsPluginSpan.traceChild('finish-modules')
        await finishModulesSpan
          .traceAsyncFn(async () => {
            // we create entry -> module maps so that we can
            // look them up faster instead of having to iterate
            // over the compilation modules list
            const entryNameMap = new Map<string, string>()
            const entryModMap = new Map<string, any>()
            const additionalEntries = new Map<string, Map<string, any>>()

            const depModMap = new Map<string, any>()

            finishModulesSpan.traceChild('get-entries').traceFn(() => {
              compilation.entries.forEach((entry, name) => {
                if (name?.replace(/\\/g, '/').startsWith('pages/')) {
                  for (const dep of entry.dependencies) {
                    if (!dep) continue
                    const entryMod = getModuleFromDependency(compilation, dep)

                    if (entryMod && entryMod.resource) {
                      if (
                        entryMod.resource.replace(/\\/g, '/').includes('pages/')
                      ) {
                        entryNameMap.set(entryMod.resource, name)
                        entryModMap.set(entryMod.resource, entryMod)
                      } else {
                        let curMap = additionalEntries.get(name)

                        if (!curMap) {
                          curMap = new Map()
                          additionalEntries.set(name, curMap)
                        }
                        depModMap.set(entryMod.resource, entryMod)
                        curMap.set(entryMod.resource, entryMod)
                      }
                    }
                  }
                }
              })
            })

            const readFile = async (
              path: string
            ): Promise<Buffer | string | null> => {
              const mod = depModMap.get(path) || entryModMap.get(path)

              // map the transpiled source when available to avoid
              // parse errors in node-file-trace
              const source = mod?.originalSource?.()

              if (source) {
                return source.buffer()
              }
              // we don't want to analyze non-transpiled
              // files here, that is done against webpack output
              return ''
            }

            const entryPaths = Array.from(entryModMap.keys())

            const collectDependencies = (mod: any) => {
              if (!mod || !mod.dependencies) return

              for (const dep of mod.dependencies) {
                const depMod = getModuleFromDependency(compilation, dep)

                if (depMod?.resource && !depModMap.get(depMod.resource)) {
                  depModMap.set(depMod.resource, depMod)
                  collectDependencies(depMod)
                }
              }
            }
            const entriesToTrace = [...entryPaths]

            entryPaths.forEach((entry) => {
              collectDependencies(entryModMap.get(entry))
              const entryName = entryNameMap.get(entry)!
              const curExtraEntries = additionalEntries.get(entryName)

              if (curExtraEntries) {
                entriesToTrace.push(...curExtraEntries.keys())
              }
            })
            let fileList: Set<string>
            let reasons: NodeFileTraceReasons
            await finishModulesSpan
              .traceChild('node-file-trace', {
                traceEntryCount: entriesToTrace.length + '',
              })
              .traceAsyncFn(async () => {
                const result = await nodeFileTrace(entriesToTrace, {
                  base: this.tracingRoot,
                  processCwd: this.appDir,
                  readFile,
                  readlink,
                  stat,
                  resolve: doResolve
                    ? async (id, parent, job, isCjs) => {
                        return doResolve(id, parent, job, !isCjs)
                      }
                    : undefined,
                  ignore: [
                    ...TRACE_IGNORES,
                    ...this.excludeFiles,
                    '**/node_modules/**',
                  ],
                  mixedModules: true,
                })
                // @ts-ignore
                fileList = result.fileList
                result.esmFileList.forEach((file) => fileList.add(file))
                reasons = result.reasons
              })

            await finishModulesSpan
              .traceChild('collect-traced-files')
              .traceAsyncFn(() => {
                const parentFilesMap = getFilesMapFromReasons(
                  fileList,
                  reasons,
                  (file) => {
                    file = nodePath.join(this.tracingRoot, file)
                    const depMod = depModMap.get(file)

                    return (
                      Array.isArray(depMod?.loaders) &&
                      depMod.loaders.length > 0
                    )
                  }
                )
                entryPaths.forEach((entry) => {
                  const entryName = entryNameMap.get(entry)!
                  const normalizedEntry = nodePath.relative(
                    this.tracingRoot,
                    entry
                  )
                  const curExtraEntries = additionalEntries.get(entryName)
                  const finalDeps = new Set<string>()

                  parentFilesMap.get(normalizedEntry)?.forEach((dep) => {
                    finalDeps.add(nodePath.join(this.tracingRoot, dep))
                  })

                  if (curExtraEntries) {
                    for (const extraEntry of curExtraEntries.keys()) {
                      const normalizedExtraEntry = nodePath.relative(
                        this.tracingRoot,
                        extraEntry
                      )
                      finalDeps.add(extraEntry)
                      parentFilesMap
                        .get(normalizedExtraEntry)
                        ?.forEach((dep) => {
                          finalDeps.add(nodePath.join(this.tracingRoot, dep))
                        })
                    }
                  }
                  this.entryTraces.set(entryName, finalDeps)
                })
              })
          })
          .then(
            () => callback(),
            (err) => callback(err)
          )
      }
    )
  }

  apply(compiler: webpack5.Compiler) {
    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      const readlink = async (path: string): Promise<string | null> => {
        try {
          return await new Promise((resolve, reject) => {
            ;(
              compilation.inputFileSystem
                .readlink as typeof import('fs').readlink
            )(path, (err, link) => {
              if (err) return reject(err)
              resolve(link)
            })
          })
        } catch (e) {
          if (
            isError(e) &&
            (e.code === 'EINVAL' || e.code === 'ENOENT' || e.code === 'UNKNOWN')
          ) {
            return null
          }
          throw e
        }
      }
      const stat = async (path: string): Promise<import('fs').Stats | null> => {
        try {
          return await new Promise((resolve, reject) => {
            ;(compilation.inputFileSystem.stat as typeof import('fs').stat)(
              path,
              (err, stats) => {
                if (err) return reject(err)
                resolve(stats)
              }
            )
          })
        } catch (e) {
          if (isError(e) && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) {
            return null
          }
          throw e
        }
      }

      const compilationSpan = spans.get(compilation) || spans.get(compiler)!
      const traceEntrypointsPluginSpan = compilationSpan.traceChild(
        'next-trace-entrypoint-plugin'
      )
      traceEntrypointsPluginSpan.traceFn(() => {
        // @ts-ignore TODO: Remove ignore when webpack 5 is stable
        compilation.hooks.processAssets.tapAsync(
          {
            name: PLUGIN_NAME,
            // @ts-ignore TODO: Remove ignore when webpack 5 is stable
            stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
          },
          (assets: any, callback: any) => {
            this.createTraceAssets(
              compilation,
              assets,
              traceEntrypointsPluginSpan,
              readlink,
              stat
            )
              .then(() => callback())
              .catch((err) => callback(err))
          }
        )

        let resolver = compilation.resolverFactory.get('normal')

        function getPkgName(name: string) {
          const segments = name.split('/')
          if (name[0] === '@' && segments.length > 1)
            return segments.length > 1 ? segments.slice(0, 2).join('/') : null
          return segments.length ? segments[0] : null
        }

        const getResolve = (options: any) => {
          const curResolver = resolver.withOptions(options)

          return (
            parent: string,
            request: string,
            job: import('@vercel/nft/out/node-file-trace').Job
          ) =>
            new Promise<[string, boolean]>((resolve, reject) => {
              const context = nodePath.dirname(parent)

              curResolver.resolve(
                {},
                context,
                request,
                {
                  fileDependencies: compilation.fileDependencies,
                  missingDependencies: compilation.missingDependencies,
                  contextDependencies: compilation.contextDependencies,
                },
                async (err: any, result?, resContext?) => {
                  if (err) return reject(err)

                  if (!result) {
                    return reject(new Error('module not found'))
                  }

                  // webpack resolver doesn't strip loader query info
                  // from the result so use path instead
                  if (result.includes('?') || result.includes('!')) {
                    result = resContext?.path || result
                  }

                  try {
                    // we need to collect all parent package.json's used
                    // as webpack's resolve doesn't expose this and parent
                    // package.json could be needed for resolving e.g. stylis
                    // stylis/package.json -> stylis/dist/umd/package.json
                    if (result.includes('node_modules')) {
                      let requestPath = result
                        .replace(/\\/g, '/')
                        .replace(/\0/g, '')

                      if (
                        !nodePath.isAbsolute(request) &&
                        request.includes('/') &&
                        resContext?.descriptionFileRoot
                      ) {
                        requestPath = (
                          resContext.descriptionFileRoot +
                          request.substr(getPkgName(request)?.length || 0) +
                          nodePath.sep +
                          'package.json'
                        )
                          .replace(/\\/g, '/')
                          .replace(/\0/g, '')
                      }

                      const rootSeparatorIndex = requestPath.indexOf('/')
                      let separatorIndex: number
                      while (
                        (separatorIndex = requestPath.lastIndexOf('/')) >
                        rootSeparatorIndex
                      ) {
                        requestPath = requestPath.substr(0, separatorIndex)
                        const curPackageJsonPath = `${requestPath}/package.json`
                        if (await job.isFile(curPackageJsonPath)) {
                          await job.emitFile(
                            curPackageJsonPath,
                            'resolve',
                            parent
                          )
                        }
                      }
                    }
                  } catch (_err) {
                    // we failed to resolve the package.json boundary,
                    // we don't block emitting the initial asset from this
                  }
                  resolve([result, options.dependencyType === 'esm'])
                }
              )
            })
        }

        const CJS_RESOLVE_OPTIONS = {
          ...NODE_RESOLVE_OPTIONS,
          fullySpecified: undefined,
          modules: undefined,
          extensions: undefined,
        }
        const BASE_CJS_RESOLVE_OPTIONS = {
          ...CJS_RESOLVE_OPTIONS,
          alias: false,
        }
        const ESM_RESOLVE_OPTIONS = {
          ...NODE_ESM_RESOLVE_OPTIONS,
          fullySpecified: undefined,
          modules: undefined,
          extensions: undefined,
        }
        const BASE_ESM_RESOLVE_OPTIONS = {
          ...ESM_RESOLVE_OPTIONS,
          alias: false,
        }

        const doResolve = async (
          request: string,
          parent: string,
          job: import('@vercel/nft/out/node-file-trace').Job,
          isEsmRequested: boolean
        ): Promise<string> => {
          const context = nodePath.dirname(parent)
          // When in esm externals mode, and using import, we resolve with
          // ESM resolving options.
          const { res } = await resolveExternal(
            this.appDir,
            this.esmExternals,
            context,
            request,
            isEsmRequested,
            (options) => (_: string, resRequest: string) => {
              return getResolve(options)(parent, resRequest, job)
            },
            undefined,
            undefined,
            ESM_RESOLVE_OPTIONS,
            CJS_RESOLVE_OPTIONS,
            BASE_ESM_RESOLVE_OPTIONS,
            BASE_CJS_RESOLVE_OPTIONS
          )

          if (!res) {
            throw new Error(`failed to resolve ${request} from ${parent}`)
          }
          return res.replace(/\0/g, '')
        }

        this.tapfinishModules(
          compilation,
          traceEntrypointsPluginSpan,
          doResolve,
          readlink,
          stat
        )
      })
    })
  }
}
