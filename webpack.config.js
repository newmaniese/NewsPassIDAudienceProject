const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

const commonConfig = {
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};

module.exports = [
  // Main library
  {
    ...commonConfig,
    entry: './src/core/newspassid.ts',
    output: {
      filename: 'newspassid.js',
      path: path.resolve(__dirname, 'dist'),
      library: {
        name: 'NewsPassID',
        type: 'umd',
        export: 'default',
      },
    },
  },
  // Async loader
  {
    ...commonConfig,
    entry: './src/loaders/async-loader.ts',
    output: {
      filename: 'newspassid-async.js',
      path: path.resolve(__dirname, 'dist'),
    },
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
      ],
    },
  },
];
