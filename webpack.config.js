const path = require('path');
const { CheckerPlugin } = require('awesome-typescript-loader');

module.exports = {
    devtool: 'source-map',
    entry: ['./src/index'],
    output: {
        path: path.resolve(__dirname, 'build'),
        publicPath: '/assets/',
        filename: 'index.js'
    },
    resolve: {
        extensions: ['.js', '.ts', '.tsx']
    },
    module: {
        loaders: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                loaders: ['awesome-typescript-loader']
            }
        ]
    },
    plugins: [
        new CheckerPlugin()
    ]
};