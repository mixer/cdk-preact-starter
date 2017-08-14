const path = require('path');

const { CheckerPlugin } = require('awesome-typescript-loader');
const { MixerPlugin } = require('miix');

module.exports = {
    devtool: 'source-map',
    entry: ['./src/index'],
    output: {
        path: path.resolve(__dirname, 'build'),
        publicPath: '',
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
    externals: {
        mixer: 'mixer',
    },
    plugins: [
        new CheckerPlugin(),
        new MixerPlugin({ homepage: 'src/index.tmpl' }),
    ],
    devServer: {
        historyApiFallback: true,
        disableHostCheck: true,
    },
};
