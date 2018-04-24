/**
 * This file is the Webpack config file for your project. Webpack is a build
 * tool that bundles up projects files into runnable code. We've set this
 * up for you, and you usually should not need to touch it.
 */

'use strict';

const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

const { CheckerPlugin } = require('awesome-typescript-loader');
const { MixerPlugin } = require('@mixer/cdk-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const CleanPlugin = require('clean-webpack-plugin');

/**
 * isProduction is from an environment variable. It's automatically set
 * when you run `miix build.`
 */
const isProduction = process.env.ENV === 'production';

const plugins = [
  // The CopyPlugin copies your static assets into the build directory.
  new CopyPlugin([
    {
      context: 'src/static',
      from: '**/*',
      to: path.resolve(__dirname, 'build/static'),
    },
  ]),
  // TypeScript checking, needed for `miix serve`.
  new CheckerPlugin(),
  // Mixer dev server, handles standard library injection and locale building.
  new MixerPlugin({
    homepage: 'src/index.html',
    locales: 'locales/*.json',
  }),
];

if (isProduction) {
  plugins.push(
    // CleanPlugin wipes the "build" directory before bundling to make sure
    // there aren't unnecessary files lying around and using up your quota.
    new CleanPlugin('build'),
  );
}

module.exports = {
  // When you run your controls your browser provides debugging tools. Source
  // maps let it map from the ugly bundle code back into your 'real' code,
  // which makes debugging a whole lot easier. These are enabled in development
  // but turned off in production: they're large and also contain your raw
  // source which you may want to keep private.
  devtool: isProduction ? false : 'source-map',
  // Entry file that webpack will start looking at:
  entry: ['./src/index'],
  // Tell webpack that we want to output our bundle to the `build` directory.
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '',
    filename: 'index.js',
  },
  // Tell webpack that these file extensions are source code that we can load:
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  // The build mode so that Webpack knows whether to compress
  // our assets for faster loading.
  mode: isProduction ? 'production' : 'development',
  module: {
    rules: [
      // Load TypeScript files using the awesome-typescript-loader, to
      // transform them into plain JavaScript.
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: ['awesome-typescript-loader'],
      },
      // Compile `scss` files using the sass loader, then pipe it through the
      // css-loader and style-loader to have it injected automatically into the
      // page when you `require('some-style-sheet.scss');`
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            query: { minimize: isProduction, url: false },
          },
          'sass-loader',
        ],
      },
      // Allow importing html and svg files directly, for the HtmlControl.
      // See the docs and examples in the HtmlControl for more info!
      {
        test: /\.(html|svg)$/,
        use: ['file-loader'],
      },
    ],
  },
  externals: {
    // Indicate to webpack that the Mixer standard library is "external" and
    // will be injected later, so Webpack shouldn't try to throw it into the
    // bundle with everything else.
    '@mixer/cdk-std': 'mixer',
  },
  // Plugins we defined above.
  plugins,
  // Dev server settings, needed for `miix serve` to work properly.
  devServer: {
    historyApiFallback: true,
    disableHostCheck: true,
  },
};
