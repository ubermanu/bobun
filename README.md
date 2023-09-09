# @ubermanu/bobun

An all-in-one bundler using `Bun.build`.

## Install

```bash
bun add @ubermanu/bobun -d
```

## Usage

```bash
bunx bobun [options]
```

### Options

- `--minify` Minify the output files
- `--sourcemap` Generate sourcemaps

## Quick Start

**Bobun** reads your `package.json` file and determines what to build without you providing any configuration.

For example, if you have a `package.json` file like this:

```json
{
  "name": "hello-world",
  "version": "1.0.0",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "hello": "dist/bin.js"
  }
}
```

Then you can build your package with:

```bash
bunx bobun
```

Which will generate these files:

```
src/index.ts → dist/index.js
src/index.ts → dist/index.d.ts
src/bin.ts → dist/bin.js
```
