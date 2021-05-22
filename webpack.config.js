const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const dist_dir = path.resolve(__dirname, 'dist')

module.exports = {
    mode: 'development',
    entry: {
        main: './src/index.js',
    },
    output: {
        filename: 'main.js',
        path: dist_dir,
    },
    plugins: [
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './src/page/index.html',
            chunks: ['main']
        })
    ]
};
