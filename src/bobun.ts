import type { BuildConfig, BunPlugin } from 'bun'
import dts from 'bun-plugin-dts'
import fs from 'fs'
import k from 'kleur'
import path from 'path'
import { createLogger } from './logger.ts'
import type { PackageJson } from './types.ts'

export interface BobunOptions {
  /** The current working directory */
  cwd: string
  /** Minify the output */
  minify?: boolean
  /** Generate sourcemaps */
  sourcemap?: boolean
}

export const bobun = async (opts: BobunOptions) => {
  const { cwd, minify, sourcemap } = { ...opts }

  const pkg: Partial<PackageJson> = await Bun.file(
    path.join(cwd, 'package.json')
  ).json()

  const logger = createLogger()

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

  const config_queue: BuildConfig[] = files.map((file) =>
    get_build_config_from_entry(file, external, minify, sourcemap)
  )

  const results = await Promise.all(
    config_queue.map(async (config) => await Bun.build(config))
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

      logger.success(config_queue[i].entrypoints[0], k.dim('→'), files[i])
    } else {
      logger.error(config_queue[i].entrypoints[0])
      logger.log('\t', result.logs.map((l) => l.message).join('\n'))
    }
  }
}

const gather_entry_points = (pkg: Partial<PackageJson>): string[] => {
  const entries = [
    pkg.main,
    pkg.module,
    pkg.types,
    ...Object.values(pkg.bin ?? {}),
    pkg.exports?.import,
    pkg.exports?.require,
    pkg.exports?.['.']?.import,
    pkg.exports?.['.']?.require,
    pkg.exports?.['.']?.types,
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
    .replace(/\.(m)js$/, '.ts')
    .replace(/\.d\.ts$/, '.ts')
    .replace(/^(.\/)?dist\//, '$1src/')

  const plugins: BunPlugin[] = []

  // Add dts plugin if the file is a declaration file
  if (filename.endsWith('.d.ts')) {
    plugins.push(dts())
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
