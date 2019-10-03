# ITU OB editor

Standalone application for editing [ITU OB website](https://ituob.org) data at https://github.com/ituob/itu-ob-data/.

The website and OB deliverables are statically generated using Jekyll ([site source](https://github.com/ituob/ituob.org/)).

The app is based on Electron and is intended to be run on any OS supported by Electron.

## Get the app

Download (unsigned) binaries from [Releases](https://github.com/ituob/itu-ob-editor/releases/).

## Setting up

You’ll need Node & Yarn.

```bash
# Install dependencies
yarn

# Run development copy
yarn dev
```

## Troubleshooting

If the app errors out, a fix could be to manually delete the cloned data repository.

1. Close the app
2. Locate and delete itu-ob-data repository
   (on macOS, it’s in `~/Library/Application Support/itu-ob-editor/`)
3. Start the app again

## Implementation Guide

### File layout under `src/`

* `sse/` directory contains static site editor framework foundation.

  This is the only directory not specific to ITU OB..

  Within it, modules are organized by functionality.
  Each module may contain `renderer` and/or `main` submodules;
  those contain units usable in Electron’s renderer (e.g., React components)
  or main (e.g., storage-related code) threads respectively.
  Anything not under those two modules is (must be) importable anywhere regardless
  of thread.

  For example, `storage` contains code for handling Git repository interaction (main-only),
  and also offers a “data synchronizer” UI component (renderer-only).

* `main/`: Electron’s main thread code.

  Contains app initialization, menu definitions, and sets up main thread API endpoints
  that browser windows can call from renderer thread.

* `renderer/`: Electron’s renderer thread initialization.

  Organized by high-level React component.

* `static/`: Application icons.

### Interaction between main and renderer threads

The app is organized in a way where a lot of the functionality involves API calls
between main and renderer threads. E.g., when a window needs to be opened,
renderer code (browser window) would call a main API endpoint, and main thread
will launch the window as required.

### Renderer

#### Window initialization

When opening a new window, the framework supplies GET query parameter `c`
which specifies the component to be loaded at top level in the window.
(See: `src/sse/main/window.ts`.)

Based on that value, renderer initialization picks
the appropriate React component class.

If a top-level component is expected to be passed any props
renderer initialization will expect GET query parameters to be passed.
Only string prop values can be expected by top-level components.
(For example, issue editor expects OB edition ID to be passed.)
(See: `src/renderer/index.tsx`.)

#### UI framework

This project uses Blueprint 3 as main UI framework.

#### Authoring React components

The convention is to use functional components.
Styling is kept in `styles.scss` files next to each component.

#### Assigning SCSS classes in React components

Local scoping is set by default for SCSS modules.
[See more in Webpack CSS loader docs.](https://github.com/webpack-contrib/css-loader#scope)

This means that during build, Webpack SCSS loader replaces class names
with random unique hashes.
When an SCSS file is imported in component module, it offers an object
where keys are the human-readable classes,
and values are the actual corresponding post-compilation hashes after compilation.

The convention is as follows:

```
import * as styles from './styles.scss';

function MyComponent() {
  return <p className={styles.myParagraphClassName}>Paragraph text…</p>
}
```

To access CSS selectors provided by Blueprint, use `:global` notation inside SCSS.
For example:

```
@import "~@blueprintjs/core/lib/scss/variables";

.myParagraphClassName {
  :global .bp3-active {
    // …
  }
}
```

## Generic Electron Webpack docs

Based on `electron-webpack`, this project comes with...

* Use of [`webpack-dev-server`](https://github.com/webpack/webpack-dev-server) for development
* HMR for both `renderer` and `main` processes
* Use of [`babel-preset-env`](https://github.com/babel/babel-preset-env) that is automatically configured based on your `electron` version
* Use of [`electron-builder`](https://github.com/electron-userland/electron-builder) to package and build a distributable electron application

Make sure to check out [`electron-webpack`'s documentation](https://webpack.electron.build/) for more details.

### Development Scripts

```bash
# run application in development mode
yarn dev

# compile source code and create webpack output
yarn compile

# `yarn compile` & create build with electron-builder
yarn dist

# `yarn compile` & create unpacked build with electron-builder
yarn dist:dir
```
