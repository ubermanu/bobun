import type { BuildConfig, BunPlugin } from 'bun'
import dts from 'bun-plugin-dts'
import fs from 'fs'
import k from 'kleur'
import path from 'path'
import prettyMs from 'pretty-ms'
import { createLogger } from './logger'
import type { PackageJson } from './types'

export interface BobunOptions {
  /** Minify the output */
  minify?: boolean
  /** Generate sourcemaps */
  sourcemap?: boolean
}

export const bobun = async (opts: BobunOptions) => {
  const { minify, sourcemap } = { ...opts }
  const logger = createLogger()
  const cwd = process.cwd()

  const pkg: Partial<PackageJson> = await Bun.file(
    path.join(cwd, 'package.json')
  ).json()

  const {
    dependencies,
    devDependencies,
    peerDependencies,
    optionalDependencies,
  } = pkg

  const external = [
    ...Object.keys(dependencies ?? {}),
    ...Object.keys(devDependencies ?? {}),
    ...Object.keys(peerDependencies ?? {}),
    ...Object.keys(optionalDependencies ?? {}),
  ]

  const files = gather_entry_points(pkg)

  if (files.length === 0) {
    logger.warn('No entries found.')
    return
  }

  logger.info(
    'Automatically detected entries:',
    files.map((f) => k.blue(f)).join(', ')
  )

  logger.info('Cleaning dist directory:', k.blue('dist'))
  await fs.promises.rm(path.join(cwd, 'dist'), { recursive: true, force: true })

  const config_queue = files.map((file) =>
    get_build_config_from_entry(file, external, minify, sourcemap)
  )

  const results = await Promise.all(
    config_queue.map(async (config) => {
      const now = performance.now()
      const output = await Bun.build(config)
      return { ...output, time: performance.now() - now }
    })
  )

  const bin_files = Object.values(pkg.bin ?? {}) as string[]

  for (const result of results) {
    const i = results.indexOf(result)

    if (result.success) {
      // Add shebang to bin files
      if (bin_files.includes(files[i])) {
        const shebang = '#!/usr/bin/env bun\n'
        const content = await Bun.file(files[i]).text()
        await Bun.write(files[i], shebang + content)
      }

      logger.success(
        config_queue[i].entrypoints[0],
        k.dim('→'),
        files[i],
        k.dim(`(${prettyMs(result.time)})`)
      )
    } else {
      logger.error(config_queue[i].entrypoints[0])
      logger.log('\t', result.logs.map((l) => l.message).join('\n'))
    }
  }

  // Check files in the dist directory, if they are not in the entrypoints
  // list, then delete them.
  let dist_files = await fs.promises.readdir(path.join(cwd, 'dist'))
  dist_files = dist_files.map(path.normalize).map((f) => `dist/${f}`)

  for (const file of dist_files) {
    if (!files.includes(file)) {
      await fs.promises.rm(file)
    }
  }
}

const gather_entry_points = (pkg: Partial<PackageJson>): string[] => {
  // Here we set the types as first entries, so the generated *.js file
  // will be either overwritten or deleted later on.
  const entries = [
    pkg.types,
    pkg.exports?.['.']?.types,
    pkg.main,
    pkg.module,
    ...Object.values(pkg.bin ?? {}),
    pkg.exports?.import,
    pkg.exports?.require,
    pkg.exports?.['.']?.import,
    pkg.exports?.['.']?.require,
  ]

  const files = entries.filter((entry) => typeof entry === 'string') as string[]

  return array_unique(files.map(path.normalize))
}

// Return a build config from a given filename
const get_build_config_from_entry = (
  filename: string,
  external: string[],
  minify: boolean = false,
  sourcemap: boolean = false
): BuildConfig => {
  const source = filename
    .replace(/^src/, 'dist')
    .replace(/\.[mc]?js$/, '.ts')
    .replace(/\.d\.ts$/, '.ts')
    .replace(/^(.\/)?dist\//, '$1src/')

  const plugins: BunPlugin[] = []

  // Add dts plugin if the file is a declaration file
  if (filename.endsWith('.d.ts')) {
    plugins.push(
      dts({
        output: {
          noBanner: true,
        },
      })
    )
  }

  if (filename.endsWith('.cjs')) {
    throw new Error('CommonJS is not supported yet.')
  }

  const naming = `[dir]/[name].${filename.endsWith('.mjs') ? 'mjs' : '[ext]'}`

  return {
    entrypoints: [source],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    naming,
    external,
    plugins,
    minify,
    sourcemap: sourcemap ? 'inline' : 'none',
  }
}

const array_unique = <T>(arr: T[]): T[] => [...new Set(arr)]
