import pkg from "../package.json";
import * as process from "node:process";

const manifest = {
  action: {
    default_icon: {
      16: "icons/16.png",
      32: "icons/32.png",
      48: "icons/48.png",
    },
    default_popup: "src/entries/popup/index.html",
  },
  background: {
    service_worker: "src/entries/background/main.ts",
  },
  content_scripts: [
    {
      js: [
          "src/entries/contentScript/primary/main.ts",
      ],
      matches: ["*://*/*"],
    },
  ],
  icons: {
    16: "icons/16.png",
    32: "icons/32.png",
    48: "icons/48.png",
    128: "icons/128.png",
  },
  options_ui: {
    page: "src/entries/options/index.html",
    open_in_tab: true,
  },
};

export function getManifest({ mode }): chrome.runtime.ManifestV3 {
  const name = pkg.displayName ?? pkg.name
  // if (mode === 'development') {
  //   for (const [key] of Object.entries(manifest.icons)) {
  //     manifest.icons[key] = 'dev/' + manifest.icons[key]
  //   }
  //   for (const [key] of Object.entries(manifest.action.default_icon)) {
  //     manifest.action.default_icon[key] = 'dev/' + manifest.action.default_icon[key]
  //   }
  // }
  return {
    description: pkg.description,
    name: mode === 'production' ? name : `${name} [Dev]`,
    version: pkg.version,
    manifest_version: 3,
    permissions: [
      "declarativeNetRequest",
      "storage",
      "notifications",
      "offscreen",
      "alarms",
    ],
    optional_permissions: [
      "clipboardWrite",
    ],
    host_permissions: [
        "*://*/*",
    ],
    optional_host_permissions:[
    ],
    ...manifest,
  };
}
