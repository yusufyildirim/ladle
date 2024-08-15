import path from "path";
import fs from "fs";
import importFrom from "import-from";

import { getBaseMetroConfig, entryFilePath } from "./metro-base.js";
import { fileURLToPath } from "url";
import metroDev from "./metro-dev.js";
import { createHTMLTemplate } from "./metro/prepare-assets.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();
const appRoot = path.resolve(__dirname, "../app");
const outDir = path.resolve(projectRoot, "./build");
const assetsDir = path.resolve(outDir, "./assets");

// const Metro = importFrom(projectRoot, "metro");
const Server = importFrom(projectRoot, "metro/src/Server");

// Helper function to prepare the out dir
function prepareOutDir() {
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true });
  }

  // Create assetsDir
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log("Cleaned up the output directory.");
}

/**
 * @param ladleConfig {import("../shared/types").Config}
 * @param configFolder {string}
 */
const metroProd = async (ladleConfig, configFolder) => {
  try {
    // Prepare the build folder
    const htmlFile = path.resolve(appRoot, "./index.html");
    const cssFile = path.resolve(appRoot, "./ladle.css");

    // Make sure the out dir is cleaned and ready.
    prepareOutDir();

    // const metroConfig = await getBaseMetroConfig();
    const onProgress = (...args) => {
      // console.log("Progress...", args);
    };

    // const build = await Metro.runBuild(metroConfig, {
    //   // entry: "./node_modules/@ladle/react/lib/app/src/index.tsx",
    //   entry: path.relative(projectRoot, entryFilePath),
    //   dev: false,
    //   minify: false,
    //   platform: "web",
    //   out: path.resolve(assetsDir, "ladle.js"),
    //   onProgress,
    // });
    const sourceMap = false;

    const { metroServer } = await metroDev(ladleConfig, configFolder);
    const bundle = await metroServer.build({
      // entry: "./node_modules/@ladle/react/lib/app/src/index.tsx",
      ...Server.DEFAULT_BUNDLE_OPTIONS,
      entryFile: path.relative(projectRoot, entryFilePath),
      dev: false,
      minify: false,
      platform: "web",
      out: path.resolve(assetsDir, "ladle.js"),
      onProgress,

      sourceMap,
      inlineSourceMap: false,
      bundleType: "bundle",
    });

    const html = createHTMLTemplate({
      bundleUrl: "assets/ladle.js",
      assets: [{ type: "css", filename: "assets/ladle.css" }],
    });

    // Manually copy/write assets
    fs.writeFileSync(path.resolve(assetsDir, "ladle.js"), bundle.code);
    fs.writeFileSync(path.resolve(outDir, "index.html"), html);
    fs.copyFileSync(cssFile, path.resolve(assetsDir, "ladle.css"));
  } catch (e) {
    console.log(e);
    return false;
  }
  return true;
};

export default metroProd;
