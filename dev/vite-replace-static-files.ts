import type { Plugin, ResolvedConfig } from "vite";
import type { EmittedFile, OutputBundle, OutputAsset } from "rollup";
import path from "path";
import fs from "fs";

export function replaceStaticFiles(options): Plugin {
    let viteConfig: ResolvedConfig
    const replacements = options.replacements
    return {
        name: 'replace-static-files',
        enforce: 'post',
        configResolved(resolvedConfig: ResolvedConfig) {
            // 存储最终解析的配置
            viteConfig = resolvedConfig
        },
        async generateBundle (options, bundle) {
            const rootDir = path.resolve(
                process.cwd(),
                viteConfig.root,
            )
            for (let [key, item ] of Object.entries(bundle)) {
                for (const { test, to } of replacements) {
                    if (!test.test(key)) {
                        continue
                    }
                    item = item as OutputAsset;
                    const replacementFilePath = path.join(rootDir, to, item.name)
                    // console.log(key, item, replacementFilePath)
                    if (!fs.existsSync(replacementFilePath)) {
                        continue
                    }
                    // console.log(key, item, path.join(rootDir, to, replacementFilePath))
                    item.source = fs.readFileSync(replacementFilePath)

                }
            }
        },
        async writeBundle(options) {
            const outIconsDir = path.resolve(
                process.cwd(),
                viteConfig.root,
                viteConfig.build.outDir,
                'icons',
            )
            const publicIconsDir = path.resolve(
                process.cwd(),
                viteConfig.root,
                'public-dev',
                'icons',
            );

            // console.log({
            //     outIconsDir,
            //     publicIconsDir,
            // })
            const fileList: Map<string, string> = new Map()
            enumerateFiles(publicIconsDir).forEach(filepath => {
                fileList.set(filepath.substring(publicIconsDir.length + 1), filepath)
            })
            enumerateFiles(outIconsDir).forEach(filename => {
                const outFilename = filename.substring(outIconsDir.length + 1)
                if (!fileList.has(outFilename)) {
                    return
                }
                // console.log({
                //     filename,
                //     outFilename,
                // })
                fs.unlinkSync(filename)
                fs.copyFileSync(fileList.get(outFilename), filename)
            })
        }
    };
}

function enumerateFiles(directory, maxLevel = -1) {
    const files = [];

    // todo 实现 maxLevel

    // 同步地读取目录中的内容
    const contents = fs.readdirSync(directory);

    contents.forEach((item) => {
        const fullPath = path.join(directory, item);

        // 检查当前项是否为目录
        if (fs.statSync(fullPath).isDirectory()) {
            // 如果是目录，则递归调用函数以获取子目录中的文件
            files.push(...enumerateFiles(fullPath, maxLevel));
        } else {
            // 如果是文件，则将文件路径添加到文件数组中
            files.push(fullPath);
        }
    });

    return files;
}
