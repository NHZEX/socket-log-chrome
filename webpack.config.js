const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HtmlPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const VueLoaderPlugin = require('vue-loader').VueLoaderPlugin;
const FileManagerPlugin = require('filemanager-webpack-plugin');

const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json')).toString())

const src_dir = path.resolve(__dirname, 'src')
const dist_dir = process.env.NODE_ENV === 'production'
    ? path.resolve(__dirname, 'release')
    : path.resolve(__dirname, 'dist');

// const pages = {}

class MyReplaceImagePlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compiler) {
        compiler.hooks.thisCompilation.tap('MyReplaceImagePlugin', (compilation) => {
            compilation.hooks.processAssets.tapAsync(
                {
                    name: 'MyReplaceImagePlugin',
                    stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                },
                (assets, callback) => {
                    const { replacements } = this.options;
                    replacements.forEach((options) => {
                        // const rootDir = compiler.options.context
                        this.replaceFiles({
                            assets,
                            options,
                        });
                    });
                    callback();
                }
            );
        });
    }

    replaceFiles({
                     assets,
                     options: { from, to },
                 }) {
        from = from.trim('/').concat('/')

        for (const [targetPath] of Object.entries(assets)) {
            if (!targetPath.startsWith(from)) {
                continue
            }
            const targetName = targetPath.replace(from, '')
            const toFilePath = path.join(to, targetName);

            if (fs.existsSync(toFilePath)) {
                const toContent = fs.readFileSync(toFilePath);
                assets[targetPath] = {
                    source: () => toContent,
                    size: () => toContent.length,
                };
            }
        }
    }

    getFiles(dir, fileList = []) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                this.getFiles(filePath, fileList);
            } else {
                fileList.push(filePath);
            }
        });
        return fileList;
    }
}

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


// const manifest = JSON.parse(fs.readdirSync(src_dir + "/manifest.json"));

const plugins = [
    new webpack.DefinePlugin({}),
    new VueLoaderPlugin(),
    new CopyPlugin({
        patterns: [
            {
                from: 'src/assets/image/logo_*.png',
                to: 'static/images/[name][ext]',
                // filter: (filepath) => {
                //     console.log(filepath)
                //     return true
                // }
            },
            {
                from: "manifest.json",
                to: dist_dir + "/manifest.json",
                transform: {
                    transformer(content) {
                        let manifest = JSON.parse(content.toString());
                        manifest.version = packageJson.version

                        // manifest.web_accessible_resources[0].resources = getResourcesList()
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
    new HtmlPlugin({
        filename: 'off_screen_read_local_storage.html',
        template: './src/off_screen/off_screen_read_local_storage.html',
        chunks: ['off_screen_read_local_storage'],
    }),
    new HtmlPlugin({
        filename: 'rule_help.html',
        template: './src/off_screen/rule_help.ejs',
        chunks: [],
    }),
]
if (process.env.NODE_ENV === 'production') {
    const DIST_FILENAME = 'release.zip'
    plugins.push(
        new FileManagerPlugin({
            events: {
                onStart: {
                    delete: ['./' + DIST_FILENAME],
                },
                onEnd: {
                    archive: [
                        {
                            source: dist_dir,
                            destination: './' + DIST_FILENAME,
                        }
                    ],
                },
            }
        })
    )
}

if (process.env.npm_config_report) {
    plugins.push(new BundleAnalyzerPlugin())
}

if (process.env.NODE_ENV !== 'production') {
    plugins.push(
        new MyReplaceImagePlugin({
            replacements: [
                {
                    from: 'static/images',
                    to: path.join(src_dir, 'assets-dev/image')
                },
            ],
        })
    )
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
        assetModuleFilename: 'assets/[contenthash][ext][query]',
        clean: true,
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
                test: /\.(png|jpe?g)$/i,
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
    plugins,
    experiments: {
    },
};
