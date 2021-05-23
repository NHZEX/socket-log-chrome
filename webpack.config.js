const path = require('path');
const fs = require('fs');
const HtmlPlugin = require('html-webpack-plugin');
const CleanPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const VueLoaderPlugin = require('vue-loader').VueLoaderPlugin;

const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json')).toString())

const src_dir = path.resolve(__dirname, 'src')
const dist_dir = path.resolve(__dirname, 'dist')

// const pages = {}

const plugins = [
    new VueLoaderPlugin(),
    new CleanPlugin(),
    new CopyPlugin({
        patterns: [
            {
                from: 'src/assets/image/logo_*.png',
                to: 'static/images/[name][ext]',
            },
            {
                from: "manifest.json",
                to: dist_dir + "/manifest.json",
                transform: {
                    transformer(content) {
                        let manifest = JSON.parse(content.toString());
                        manifest.version = packageJson.version
                        return Buffer.from(JSON.stringify(manifest, null, 2));
                    },
                },
            },
        ]
    }),
    new HtmlPlugin({
        filename: 'popup.html',
        template: './src/popup/index.ejs',
        chunks: ['popup'],
    }),
    new HtmlPlugin({
        filename: 'options.html',
        template: './src/options/index.ejs',
        chunks: ['options'],
    }),
]

if (process.env.npm_config_report) {
    plugins.push(new BundleAnalyzerPlugin())
}

module.exports = {
    mode: 'production',
    devtool: 'inline-source-map',
    target: 'web',
    entry: {
        background: './src/background/index.js',
        content: './src/content/index.js',
        popup: './src/popup/index.js',
        options: './src/options/index.js',
    },
    output: {
        filename: '[name]/index.js',
        path: dist_dir,
        publicPath: './',
        assetModuleFilename: 'assets/[hash][ext][query]',
    },
    resolve: {
        alias: {
            src: src_dir,
            '@': src_dir,
        }
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader'
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|jpg|gif)$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'static/images/[name][ext][query]'
                }
            },
            {
                test: /manifest\.js$/i,
                type: 'asset/resource',
                generator: {
                    filename: 'manifest.js'
                }
            },
        ],
    },
    plugins: plugins,
};
