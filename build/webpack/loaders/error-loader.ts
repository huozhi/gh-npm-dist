import chalk from 'next/dist/compiled/chalk'
import path from 'path'
import { webpack } from 'next/dist/compiled/webpack/webpack'

const ErrorLoader: webpack.loader.Loader = function () {
  // @ts-ignore exists
  const options = this.getOptions() || {}

  const { reason = 'An unknown error has occurred' } = options

  const resource = this._module?.issuer?.resource ?? null
  const context = this.rootContext ?? this._compiler?.context

  const issuer = resource
    ? context
      ? path.relative(context, resource)
      : resource
    : null

  const err = new Error(
    reason + (issuer ? `\nLocation: ${chalk.cyan(issuer)}` : '')
  )
  this.emitError(err)
}

export default ErrorLoader
