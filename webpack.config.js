const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');
const CleanPlugin = require('clean-webpack-plugin').CleanWebpackPlugin;
const CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const VueLoaderPlugin = require('vue-loader').VueLoaderPlugin;

const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json')).toString())

const src_dir = path.resolve(__dirname, 'src')
const dist_dir = path.resolve(__dirname, 'dist')

// const pages = {}

function enumerateFiles(directory) {
    const files = [];

    // 同步地读取目录中的内容
    const contents = fs.readdirSync(directory);

    contents.forEach((item) => {
        const fullPath = path.join(directory, item);

        // 检查当前项是否为目录
        if (fs.statSync(fullPath).isDirectory()) {
            // 如果是目录，则递归调用函数以获取子目录中的文件
            files.push(...enumerateFiles(fullPath));
        } else {
            // 如果是文件，则将文件路径添加到文件数组中
            files.push(fullPath);
        }
    });

    return files;
}

function getResourcesList()
{
    return enumerateFiles(path.resolve(src_dir, 'assets', 'image')).map(file => {
        return 'static/images/' + path.parse(file).base
    })
}

const plugins = [
    new webpack.DefinePlugin({
        __VUE_PROD_DEVTOOLS__: process.env.NODE_ENV === 'development',
    }),
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
                        if (process.env.NODE_ENV === 'development') {
                            // manifest.content_security_policy = "script-src 'self' 'unsafe-eval'; object-src 'self';"
                        }

                        manifest.web_accessible_resources[0].resources = getResourcesList()
                        return Buffer.from(JSON.stringify(manifest, null, 2));
                    },
                },
            },
            // {
            //     from: "src/off_screen_read_local_storage.html",
            //     to: dist_dir + "/off_screen_read_local_storage.html",
            // }
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
    new HtmlPlugin({
        filename: 'off_screen_read_local_storage.html',
        template: './src/off_screen/off_screen_read_local_storage.html',
        chunks: ['off_screen_read_local_storage'],
    }),
]

if (process.env.npm_config_report) {
    plugins.push(new BundleAnalyzerPlugin())
}

module.exports = {
    mode: process.env.NODE_ENV || 'production',
    devtool: process.env.NODE_ENV === 'production' ? false : 'inline-source-map',
    target: 'web',
    entry: {
        background: './src/background/index.js',
        content: './src/content/index.js',
        popup: './src/popup/index.js',
        options: './src/options/index.js',
        off_screen_read_local_storage: './src/off_screen/off_screen_read_local_storage.js',
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
    experiments: {
        topLevelAwait: true,
    },
};
