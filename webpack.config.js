const path = require('path');

const { CheckerPlugin } = require('awesome-typescript-loader');
const { MixerPlugin } = require('miix/webpack');

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
            },
            {
                test: /\.scss$/,
                loaders: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /.(png|woff(2)?|eot|ttf|svg)(\?[a-z0-9=\.]+)?$/,
                use: 'url-loader?limit=100000',
            },
        ]
    },
    externals: {
        'miix/std': 'mixer',
    },
    plugins: [
        new CheckerPlugin(),
        new MixerPlugin({ homepage: 'src/index.html' }),
    ],
    devServer: {
        historyApiFallback: true,
        disableHostCheck: true,
    },
};
