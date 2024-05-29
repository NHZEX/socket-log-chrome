import {defineConfig, type PluginOption} from "vite";
import vue from "@vitejs/plugin-vue";
import webExtension from "@samrum/vite-plugin-web-extension";
import path from "path";
import {getManifest} from "./src/manifest";
import removeConsole from "vite-plugin-remove-console";
import {replaceStaticFiles} from "./dev/vite-replace-static-files";
import zipPack from "vite-plugin-zip-pack";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const plugins: PluginOption[] = [
    vue(),
    webExtension({
      manifest: getManifest({ mode }),
    }),
  ]
  if (mode !== 'production') {
    plugins.push(
      replaceStaticFiles({
        replacements: [
          {
            test: /assets\/.*\.png/,
            to: 'public-dev/icons'
          }
        ]
      })
    )
  }
  if (mode === 'production') {
    plugins.push(removeConsole({
      includes: ["debug"],
    }))
    plugins.push(zipPack({
      inDir: 'release',
      outDir: __dirname,
      outFileName: 'release.zip',
    }))
  }
  return {
    plugins,
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
        "~icon": path.resolve(__dirname, "./public/icons"),
      },
    },
    build: {
      outDir: mode === 'production' ? 'release' : 'dist',
      assetsInlineLimit: 0,
      rollupOptions: {
        input: [
          'src/entries/off_screen/off_screen_read_local_storage.html'
        ],
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'libs/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        }
      }
    }
  };
});
