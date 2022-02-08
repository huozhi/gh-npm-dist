import chalk from 'next/dist/compiled/chalk'
import stripAnsi from 'next/dist/compiled/strip-ansi'
import textTable from 'next/dist/compiled/text-table'
import createStore from 'next/dist/compiled/unistore'
import formatWebpackMessages from '../../client/dev/error-overlay/format-webpack-messages'
import { OutputState, store as consoleStore } from './store'
import type { webpack5 } from 'next/dist/compiled/webpack/webpack'

export function startedDevelopmentServer(appUrl: string, bindAddr: string) {
  consoleStore.setState({ appUrl, bindAddr })
}

let previousClient: webpack5.Compiler | null = null
let previousServer: webpack5.Compiler | null = null
let previousServerWeb: webpack5.Compiler | null = null

type CompilerDiagnostics = {
  modules: number
  errors: string[] | null
  warnings: string[] | null
}

type WebpackStatus =
  | { loading: true }
  | ({ loading: false } & CompilerDiagnostics)

type AmpStatus = {
  message: string
  line: number
  col: number
  specUrl: string | null
  code: string
}

export type AmpPageStatus = {
  [page: string]: { errors: AmpStatus[]; warnings: AmpStatus[] }
}

type BuildStatusStore = {
  client: WebpackStatus
  server: WebpackStatus
  serverWeb?: WebpackStatus
  trigger: string | undefined
  amp: AmpPageStatus
}

export function formatAmpMessages(amp: AmpPageStatus) {
  let output = chalk.bold('Amp Validation') + '\n\n'
  let messages: string[][] = []

  const chalkError = chalk.red('error')
  function ampError(page: string, error: AmpStatus) {
    messages.push([page, chalkError, error.message, error.specUrl || ''])
  }

  const chalkWarn = chalk.yellow('warn')
  function ampWarn(page: string, warn: AmpStatus) {
    messages.push([page, chalkWarn, warn.message, warn.specUrl || ''])
  }

  for (const page in amp) {
    let { errors, warnings } = amp[page]

    const devOnlyFilter = (err: AmpStatus) => err.code !== 'DEV_MODE_ONLY'
    errors = errors.filter(devOnlyFilter)
    warnings = warnings.filter(devOnlyFilter)
    if (!(errors.length || warnings.length)) {
      // Skip page with no non-dev warnings
      continue
    }

    if (errors.length) {
      ampError(page, errors[0])
      for (let index = 1; index < errors.length; ++index) {
        ampError('', errors[index])
      }
    }
    if (warnings.length) {
      ampWarn(errors.length ? '' : page, warnings[0])
      for (let index = 1; index < warnings.length; ++index) {
        ampWarn('', warnings[index])
      }
    }
    messages.push(['', '', '', ''])
  }

  if (!messages.length) {
    return ''
  }

  output += textTable(messages, {
    align: ['l', 'l', 'l', 'l'],
    stringLength(str: string) {
      return stripAnsi(str).length
    },
  })

  return output
}

const buildStore = createStore<BuildStatusStore>()
let buildWasDone = false
let clientWasLoading = true
let serverWasLoading = true
let serverWebWasLoading = false

buildStore.subscribe((state) => {
  const { amp, client, server, serverWeb, trigger } = state

  const { appUrl } = consoleStore.getState()

  if (client.loading || server.loading || serverWeb?.loading) {
    consoleStore.setState(
      {
        bootstrap: false,
        appUrl: appUrl!,
        loading: true,
        trigger,
      } as OutputState,
      true
    )
    clientWasLoading = (!buildWasDone && clientWasLoading) || client.loading
    serverWasLoading = (!buildWasDone && serverWasLoading) || server.loading
    serverWebWasLoading =
      (!buildWasDone && serverWasLoading) || !!serverWeb?.loading
    buildWasDone = false
    return
  }
  if (serverWeb?.loading) return

  buildWasDone = true

  let partialState: Partial<OutputState> = {
    bootstrap: false,
    appUrl: appUrl!,
    loading: false,
    typeChecking: false,
    partial:
      clientWasLoading && (serverWasLoading || serverWebWasLoading)
        ? 'client and server'
        : undefined,
    modules:
      (clientWasLoading ? client.modules : 0) +
      (serverWasLoading ? server.modules : 0) +
      (serverWebWasLoading ? serverWeb?.modules || 0 : 0),
    hasServerWeb: !!serverWeb,
  }
  if (client.errors) {
    // Show only client errors
    consoleStore.setState(
      {
        ...partialState,
        errors: client.errors,
        warnings: null,
      } as OutputState,
      true
    )
  } else if (server.errors) {
    // Show only server errors
    consoleStore.setState(
      {
        ...partialState,
        errors: server.errors,
        warnings: null,
      } as OutputState,
      true
    )
  } else if (serverWeb && serverWeb.errors) {
    // Show only serverWeb errors
    consoleStore.setState(
      {
        ...partialState,
        errors: serverWeb.errors,
        warnings: null,
      } as OutputState,
      true
    )
  } else {
    // Show warnings from all of them
    const warnings = [
      ...(client.warnings || []),
      ...(server.warnings || []),
      ...((serverWeb && serverWeb.warnings) || []),
    ].concat(formatAmpMessages(amp) || [])

    consoleStore.setState(
      {
        ...partialState,
        errors: null,
        warnings: warnings.length === 0 ? null : warnings,
      } as OutputState,
      true
    )
  }
})

export function ampValidation(
  page: string,
  errors: AmpStatus[],
  warnings: AmpStatus[]
) {
  const { amp } = buildStore.getState()
  if (!(errors.length || warnings.length)) {
    buildStore.setState({
      amp: Object.keys(amp)
        .filter((k) => k !== page)
        .sort()
        // eslint-disable-next-line no-sequences
        .reduce((a, c) => ((a[c] = amp[c]), a), {} as AmpPageStatus),
    })
    return
  }

  const newAmp: AmpPageStatus = { ...amp, [page]: { errors, warnings } }
  buildStore.setState({
    amp: Object.keys(newAmp)
      .sort()
      // eslint-disable-next-line no-sequences
      .reduce((a, c) => ((a[c] = newAmp[c]), a), {} as AmpPageStatus),
  })
}

export function watchCompilers(
  client: webpack5.Compiler,
  server: webpack5.Compiler,
  serverWeb: webpack5.Compiler
) {
  if (
    previousClient === client &&
    previousServer === server &&
    previousServerWeb === serverWeb
  ) {
    return
  }

  buildStore.setState({
    client: { loading: true },
    server: { loading: true },
    serverWeb: serverWeb ? { loading: true } : undefined,
    trigger: 'initial',
  })

  function tapCompiler(
    key: string,
    compiler: any,
    onEvent: (status: WebpackStatus) => void
  ) {
    compiler.hooks.invalid.tap(`NextJsInvalid-${key}`, () => {
      onEvent({ loading: true })
    })

    compiler.hooks.done.tap(`NextJsDone-${key}`, (stats: webpack5.Stats) => {
      buildStore.setState({ amp: {} })

      const { errors, warnings } = formatWebpackMessages(
        stats.toJson({
          preset: 'errors-warnings',
          moduleTrace: true,
        })
      )

      const hasErrors = !!errors?.length
      const hasWarnings = !!warnings?.length

      onEvent({
        loading: false,
        modules: stats.compilation.modules.size,
        errors: hasErrors ? errors : null,
        warnings: hasWarnings ? warnings : null,
      })
    })
  }

  tapCompiler('client', client, (status) => {
    if (!status.loading && !buildStore.getState().server.loading) {
      buildStore.setState({
        client: status,
        trigger: undefined,
      })
    } else {
      buildStore.setState({
        client: status,
      })
    }
  })
  tapCompiler('server', server, (status) => {
    if (!status.loading && !buildStore.getState().client.loading) {
      buildStore.setState({
        server: status,
        trigger: undefined,
      })
    } else {
      buildStore.setState({
        server: status,
      })
    }
  })
  if (serverWeb) {
    tapCompiler('serverWeb', serverWeb, (status) => {
      buildStore.setState({
        serverWeb: status,
        trigger: undefined,
      })
    })
  }

  previousClient = client
  previousServer = server
  previousServerWeb = serverWeb
}

export function reportTrigger(trigger: string) {
  buildStore.setState({
    trigger,
  })
}
