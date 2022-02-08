#!/usr/bin/env node
import os from 'os'
import childProcess from 'child_process'

import chalk from 'next/dist/compiled/chalk'
import arg from 'next/dist/compiled/arg/index.js'
import { printAndExit } from '../server/lib/utils'
import { cliCommand } from '../bin/next'
import isError from '../lib/is-error'

const nextInfo: cliCommand = async (argv) => {
  const validArgs: arg.Spec = {
    // Types
    '--help': Boolean,
    // Aliases
    '-h': '--help',
  }
  let args: arg.Result<arg.Spec>
  try {
    args = arg(validArgs, { argv })
  } catch (error) {
    if (isError(error) && error.code === 'ARG_UNKNOWN_OPTION') {
      return printAndExit(error.message, 1)
    }
    throw error
  }

  if (args['--help']) {
    console.log(
      `
      Description
        Prints relevant details about the current system which can be used to report Next.js bugs
        
      Usage
        $ next info

      Learn more: ${chalk.cyan(
        'https://nextjs.org/docs/api-reference/cli#info'
      )}`
    )
    return
  }

  console.log(`
    Operating System:
      Platform: ${os.platform()}
      Arch: ${os.arch()}
      Version: ${os.version()}
    Binaries:
      Node: ${process.versions.node}
      npm: ${getBinaryVersion('npm')}
      Yarn: ${getBinaryVersion('yarn')}
      pnpm: ${getBinaryVersion('pnpm')}
    Relevant packages:
      next: ${getPackageVersion('next')}
      react: ${getPackageVersion('react')}
      react-dom: ${getPackageVersion('react-dom')}`)
}

export { nextInfo }

function getPackageVersion(packageName: string) {
  try {
    return require(`${packageName}/package.json`).version
  } catch {
    return 'N/A'
  }
}

function getBinaryVersion(binaryName: string) {
  try {
    return childProcess.execSync(`${binaryName} --version`).toString().trim()
  } catch {
    return 'N/A'
  }
}
