const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: {
    popup: './src/popup.js',
    background: './src/background.js',
    tablocker: './src/tablocker.js',
    'dashboard-init': './src/dashboard-init.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './popup.html',
      filename: 'popup.html',
      chunks: ['popup']
    }),
    new HtmlWebpackPlugin({
      template: './src/tablocker.html',
      filename: 'tablocker.html',
      chunks: ['tablocker']
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json' },
        { from: 'icons', to: 'icons' },
        { from: './src/dashboard.html', to: 'dashboard.html' }
      ]
    })
  ]
};
