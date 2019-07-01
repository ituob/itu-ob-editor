# ITU OB editor

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

## Implementation Guide

Core implementation is under `src/renderer`.

* `styles.scss`: Styles relevant before the app is loaded.
* `app/`: Application & its components.
* `app/workspace`: Listing/loading/saving entities.
  Interacts with Git repository and YAML files in the working copy.

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
