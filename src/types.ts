export interface PackageJson {
  main: string
  module: string
  types: string
  bin: Record<string, string>
  exports: {
    import: string
    require: string
    '.': {
      import: string
      require: string
      types: string
    }
  }
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  optionalDependencies: Record<string, string>
}
