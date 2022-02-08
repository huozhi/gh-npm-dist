import { webpack } from 'next/dist/compiled/webpack/webpack'
import type { webpack5 } from 'next/dist/compiled/webpack/webpack'
import { Span } from '../trace'

export type CompilerResult = {
  errors: webpack5.StatsError[]
  warnings: webpack5.StatsError[]
}

function generateStats(
  result: CompilerResult,
  stat: webpack5.Stats
): CompilerResult {
  const { errors, warnings } = stat.toJson({
    preset: 'errors-warnings',
    moduleTrace: true,
  })
  if (errors && errors.length > 0) {
    result.errors.push(...errors)
  }

  if (warnings && warnings.length > 0) {
    result.warnings.push(...warnings)
  }

  return result
}

// Webpack 5 requires the compiler to be closed (to save caches)
// Webpack 4 does not have this close method so in order to be backwards compatible we check if it exists
function closeCompiler(compiler: webpack5.Compiler | webpack5.MultiCompiler) {
  return new Promise<void>((resolve, reject) => {
    // @ts-ignore Close only exists on the compiler in webpack 5
    return compiler.close((err: any) => (err ? reject(err) : resolve()))
  })
}

export function runCompiler(
  config: webpack.Configuration,
  { runWebpackSpan }: { runWebpackSpan: Span }
): Promise<CompilerResult> {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config) as unknown as webpack5.Compiler
    compiler.run((err, stats) => {
      const webpackCloseSpan = runWebpackSpan.traceChild('webpack-close', {
        name: config.name,
      })
      webpackCloseSpan
        .traceAsyncFn(() => closeCompiler(compiler))
        .then(() => {
          if (err) {
            const reason = err.stack ?? err.toString()
            if (reason) {
              return resolve({
                errors: [{ message: reason, details: (err as any).details }],
                warnings: [],
              })
            }
            return reject(err)
          } else if (!stats) throw new Error('No Stats from webpack')

          const result = webpackCloseSpan
            .traceChild('webpack-generate-error-stats')
            .traceFn(() => generateStats({ errors: [], warnings: [] }, stats))
          return resolve(result)
        })
    })
  })
}
