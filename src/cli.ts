import sade from 'sade'
import pkg from '../package.json' assert { type: 'json' }
import { bobun } from './bobun.ts'

const program = sade('bobun', true)

program
  .version(pkg.version)
  .describe('Build your frontend assets with Bobun.')
  .option('--minify', 'Minify the output', false)
  .option('--sourcemap', 'Generate sourcemaps', false)

program.action(async (opts) => {
  await bobun({
    cwd: process.cwd(),
    minify: !!opts.minify,
    sourcemap: !!opts.sourcemap,
  })
})

program.parse(process.argv)
