import { PackageJson } from './types'

export function generate_license_header(pkg: Partial<PackageJson>): string {
  const parts: string[] = []

  if (pkg.version) {
    parts.push(`Version: ${pkg.version}`)
  }

  if (pkg.license) {
    parts.push(`License: ${pkg.license}`)
  }

  if (pkg.author) {
    parts.push(`Author: ${pkg.author}`)
  }

  parts.push(
    `Date: ${new Date().toLocaleString()}`
  )

  return '/*!\n * ' + parts.join('\n * ') + '\n */\n'
}
