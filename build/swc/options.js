const nextDistPath =
  /(next[\\/]dist[\\/]shared[\\/]lib)|(next[\\/]dist[\\/]client)|(next[\\/]dist[\\/]pages)/

const regeneratorRuntimePath = require.resolve(
  'next/dist/compiled/regenerator-runtime'
)

export function getBaseSWCOptions({
  filename,
  jest,
  development,
  hasReactRefresh,
  globalWindow,
  nextConfig,
  resolvedBaseUrl,
  jsConfig,
}) {
  const isTSFile = filename.endsWith('.ts')
  const isTypeScript = isTSFile || filename.endsWith('.tsx')
  const paths = jsConfig?.compilerOptions?.paths
  const enableDecorators = Boolean(
    jsConfig?.compilerOptions?.experimentalDecorators
  )
  const emitDecoratorMetadata = Boolean(
    jsConfig?.compilerOptions?.emitDecoratorMetadata
  )
  return {
    jsc: {
      ...(resolvedBaseUrl && paths
        ? {
            baseUrl: resolvedBaseUrl,
            paths,
          }
        : {}),
      parser: {
        syntax: isTypeScript ? 'typescript' : 'ecmascript',
        dynamicImport: true,
        importAssertions: true,
        decorators: enableDecorators,
        // Exclude regular TypeScript files from React transformation to prevent e.g. generic parameters and angle-bracket type assertion from being interpreted as JSX tags.
        [isTypeScript ? 'tsx' : 'jsx']: isTSFile ? false : true,
      },
      experimental: {
        keepImportAssertions: true,
      },
      transform: {
        // Enables https://github.com/swc-project/swc/blob/0359deb4841be743d73db4536d4a22ac797d7f65/crates/swc_ecma_ext_transforms/src/jest.rs
        ...(jest
          ? {
              hidden: {
                jest: true,
              },
            }
          : {}),
        legacyDecorator: enableDecorators,
        decoratorMetadata: emitDecoratorMetadata,
        react: {
          importSource: jsConfig?.compilerOptions?.jsxImportSource || 'react',
          runtime: 'automatic',
          pragma: 'React.createElement',
          pragmaFrag: 'React.Fragment',
          throwIfNamespace: true,
          development: !!development,
          useBuiltins: true,
          refresh: !!hasReactRefresh,
        },
        optimizer: {
          simplify: false,
          globals: jest
            ? null
            : {
                typeofs: {
                  window: globalWindow ? 'object' : 'undefined',
                },
                envs: {
                  NODE_ENV: development ? '"development"' : '"production"',
                },
                // TODO: handle process.browser to match babel replacing as well
              },
        },
        regenerator: {
          importPath: regeneratorRuntimePath,
        },
      },
    },
    sourceMaps: jest ? 'inline' : undefined,
    styledComponents: nextConfig?.experimental?.styledComponents
      ? {
          displayName: Boolean(development),
        }
      : null,
    removeConsole: nextConfig?.experimental?.removeConsole,
    reactRemoveProperties: nextConfig?.experimental?.reactRemoveProperties,
    relay: nextConfig?.experimental?.relay,
  }
}

export function getJestSWCOptions({
  isServer,
  filename,
  esm,
  nextConfig,
  jsConfig,
  // This is not passed yet as "paths" resolving needs a test first
  // resolvedBaseUrl,
}) {
  let baseOptions = getBaseSWCOptions({
    filename,
    jest: true,
    development: false,
    hasReactRefresh: false,
    globalWindow: !isServer,
    nextConfig,
    jsConfig,
    // resolvedBaseUrl,
  })

  const isNextDist = nextDistPath.test(filename)

  return {
    ...baseOptions,
    env: {
      targets: {
        // Targets the current version of Node.js
        node: process.versions.node,
      },
      // we always transpile optional chaining and nullish coalescing
      // since it can cause issues with webpack even if the node target
      // supports them
      include: [
        'proposal-optional-chaining',
        'proposal-nullish-coalescing-operator',
      ],
    },
    module: {
      type: esm && !isNextDist ? 'es6' : 'commonjs',
    },
    disableNextSsg: true,
    disablePageConfig: true,
  }
}

export function getLoaderSWCOptions({
  filename,
  development,
  isServer,
  pagesDir,
  isPageFile,
  hasReactRefresh,
  nextConfig,
  jsConfig,
  // This is not passed yet as "paths" resolving is handled by webpack currently.
  // resolvedBaseUrl,
}) {
  let baseOptions = getBaseSWCOptions({
    filename,
    development,
    globalWindow: !isServer,
    hasReactRefresh,
    nextConfig,
    jsConfig,
    // resolvedBaseUrl,
  })

  const isNextDist = nextDistPath.test(filename)

  if (isServer) {
    return {
      ...baseOptions,
      // Disables getStaticProps/getServerSideProps tree shaking on the server compilation for pages
      disableNextSsg: true,
      disablePageConfig: true,
      isDevelopment: development,
      isServer,
      pagesDir,
      isPageFile,
      env: {
        targets: {
          // Targets the current version of Node.js
          node: process.versions.node,
        },
        // we always transpile optional chaining and nullish coalescing
        // since it can cause issues with webpack even if the node target
        // supports them
        include: [
          'proposal-optional-chaining',
          'proposal-nullish-coalescing-operator',
        ],
      },
    }
  } else {
    // Matches default @babel/preset-env behavior
    baseOptions.jsc.target = 'es5'
    return {
      ...baseOptions,
      // Ensure Next.js internals are output as commonjs modules
      ...(isNextDist
        ? {
            module: {
              type: 'commonjs',
            },
          }
        : {}),
      disableNextSsg: !isPageFile,
      isDevelopment: development,
      isServer,
      pagesDir,
      isPageFile,
    }
  }
}
