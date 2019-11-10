# ITU OB editor

Standalone application for editing [ITU OB website](https://ituob.org) data.

## Get the app

Download the application from the [Releases page](https://github.com/ituob/itu-ob-editor/releases/).

Note: binaries are unsigned, which means your computer will warn you about launching an untrusted application.

* On macOS, copy the application into your Applications folder.

* On Windows, run the one-click installer. App’s shortcut should appear on your desktop.

### Updating to latest version

Simply download the latest release and go through the same copy/install process.

If you have trouble using the app after upgrade, try resetting application data
as described in the troubleshooting section below.

## Using the app

Access application help at https://www.ituob.org/docs/.
(You can also do that using Help menu in the app, but that feature is macOS-only for now.)

### Troubleshooting problems

ITU OB Editor is under active development, so please mind that sometimes the app may misbehave.

* If you have encountered an error or other possible malfunction while using the application,
  please [report it here](https://github.com/ituob/itu-ob-editor/issues/new/choose).

* As a troubleshooting measure, you can try accessing Settings -> Reset application data.
  You will lose any local changes you may have made to ITU OB.

## Developer’s documentation

The app is based on Electron and is intended to be run on any OS supported by Electron.

App’s upstream data repository is located at https://github.com/ituob/itu-ob-data/.

The website and OB deliverables are statically generated from that repository using Jekyll.
Site source is located at https://github.com/ituob/ituob.org/.

### Setting up

You’ll need Node & Yarn.

```bash
# Install dependencies
yarn

# Run development copy
yarn dev
```

### Debugging

Text logs are written in default locations as set
by [electron-log](https://github.com/megahertz/electron-log/tree/v3.0.9):

* on macOS: `~/Library/Logs/<app name>/log.log`
* on Windows: `%USERPROFILE%\AppData\Roaming\<app name>\log.log`
* on Linux: `~/.config/<app name>/log.log`

### Resetting app data manually during development

If the app errors out, a fix could be to manually delete the cloned data repository.

1. Close the app
2. Locate and delete itu-ob-data directory and itu-ob-settings.yaml file
   (on macOS, they’re in `~/Library/Application Support/itu-ob-editor/`)
3. Start the app again

### Implementation Guide

Note: Publications of OB are interchangeably called “edition” and “issue” within source code.

#### SSE library

This app is using [the SSE elements library](https://github.com/riboseinc/sse-elements).
In addition to using the tools it provides, the app also follows its underlying philosophy,
e.g. using “API endpoints” for communicating between main and renderer threads.

#### File layout under `src/`

* `main/`: Electron’s main thread code.

  Contains app initialization, menu definitions, and sets up main thread API endpoints
  that browser windows can call from renderer thread.

* `renderer/`: Electron’s renderer thread initialization.

  Organized by high-level React component.

* `static/`: Application icons.

#### Renderer

##### Window initialization

When opening a new window, SSE supplies GET query parameter `c`
which specifies the component to be loaded at top level in the window.
(See: `main/window.ts` in `sse-elements`.)

Based on that value, renderer initialization picks
the appropriate React component class.

If a top-level component is expected to be passed any props
renderer initialization will expect GET query parameters to be passed.
Only string prop values can be expected by top-level components.
(For example, issue editor expects OB edition ID to be passed.)
(See: `src/renderer/index.tsx`.)

##### Authoring React components

Refer to documentation for [SSE elements](https://github.com/riboseinc/sse-elements/)
for conventions.

## Generic Electron Webpack docs

Note: These are kept for reference and may be obsolete.

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
