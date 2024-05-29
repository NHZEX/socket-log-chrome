import {defineConfig, normalizePath, type ResolvedConfig} from "vite";
import vue from "@vitejs/plugin-vue";
import webExtension from "@samrum/vite-plugin-web-extension";
import path from "path";
import fs from 'fs';
import {getManifest} from "./src/manifest";
import {replaceStaticFiles} from "./dev/vite-replace-static-files";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      vue(),
      webExtension({
        manifest: getManifest({ mode }),
      }),
      replaceStaticFiles({
        replacements: [
          {
            test: /assets\/.*\.png/,
            to: 'public/dev/icons'
          }
        ]
      }),
    ],
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
