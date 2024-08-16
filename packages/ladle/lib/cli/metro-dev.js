import fs from "fs";
import { parse } from "url";
import { Buffer } from "buffer";
import path from "path";
import getPort from "get-port";

import { runServer } from "./runServer-fork.js";
import openBrowser from "./open-browser.js";
import { getBaseMetroConfig } from "./metro-base.js";
import { getVirtualModuleByPath } from "./metro-virtual-mods.js";
import { createHTMLTemplate } from "./metro/prepare-assets.js";
import { globby } from "globby";
import { getMetaJsonString } from "./vite-plugin/generate/get-meta-json.js";
import { getEntryData } from "./vite-plugin/parse/get-entry-data.js";
import { appRoot, projectPublicDir, projectRoot } from "./metro/utils.js";
import importFrom from "import-from";
import cleanupWindowsPath from "./vite-plugin/generate/cleanup-windows-path.js";
const express = importFrom(projectRoot, "express");

/**
 * @param ladleConfig {import("../shared/types").Config}
 * @param configFolder {string}
 */
export function getExtraHeaderStuff(ladleConfig, configFolder) {
  let appendToHead = "";

  const headHtmlPath = path.join(configFolder, "head.html");
  if (fs.existsSync(headHtmlPath)) {
    appendToHead = fs.readFileSync(headHtmlPath, "utf8");
  }
  if (ladleConfig.appendToHead) {
    appendToHead += ladleConfig.appendToHead;
  }

  return appendToHead;
}
/**
 * @param ladleConfig {import("../shared/types").Config}
 * @param configFolder {string}
 */
const metroDev = async (ladleConfig, configFolder) => {
  /**
   * Middleware for handling the index page request.
   * @param {import('express').Request} req - The Express request object.
   * @param {import('express').Response} res - The Express response object.
   * @param {import('express').NextFunction} next - The Express next middleware function.
   */
  async function ladleMiddleware(req, res, next) {
    const url = parse(req.url, true);
    const platformParam = url.query?.platform;

    const isBundlerRequest = platformParam === "web";
    const isAssetRequest = req.url === "/assets/ladle.css";
    const isMetaFile = req.url === "/meta.json";

    if (isBundlerRequest) return next();
    if (isMetaFile) {
      const entryData = await getEntryData(
        await globby(
          Array.isArray(ladleConfig.stories)
            ? ladleConfig.stories
            : [ladleConfig.stories],
        ),
      );
      const meta = getMetaJsonString(entryData);

      res.setHeader("Content-Type", "text/json");
      res.end(meta);
      return;
    } else if (isAssetRequest) {
      res.setHeader("Content-Type", "text/css");
      res.end(fs.readFileSync(path.join(appRoot, "ladle.css")));
      return;
    }

    // Serve HTML
    // TODO: Add config.appendToHead support.
    const html = createHTMLTemplate({
      appendToHead: getExtraHeaderStuff(ladleConfig, configFolder),
      assets: [{ type: "css", filename: "assets/ladle.css" }],
      bundleUrl:
        "node_modules/@ladle/react/lib/app/src/index.bundle?platform=web&amp;dev=true&amp;hot=false&amp;lazy=true&amp;transform.engine=hermes&amp;transform.routerRoot=app",
    });
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return next();
  }

  const port = await getPort({
    port: [ladleConfig.port, 61001, 62002, 62003, 62004, 62005],
  });
  // TODO: Support HTTPS
  const useHttps = false;
  const hostname = ladleConfig.host ?? "localhost";
  const serverUrl = `${useHttps ? "https" : "http"}://${hostname}:${port}`;

  const metroConfig = await getBaseMetroConfig(port, ladleConfig);
  const { metroServer, httpServer } = await runServer(metroConfig, {
    host: hostname,
    unstable_extraMiddleware: [
      // Serve static assets from project's /public dir
      express.static(projectPublicDir),

      // Serve Ladle specific stuff
      ladleMiddleware,
    ],

    // Prod stuff
    watch: !process.env.LADLE_BUILD,
    metroServerOnly: process.env.LADLE_BUILD,
  });

  if (!process.env.LADLE_BUILD) {
    openBrowser(serverUrl);
  }

  const metroBundler = metroServer.getBundler().getBundler();
  const originalTransformFile = metroBundler.transformFile.bind(metroBundler);
  /**
   * @param {string} filePath
   * @param {object} transformOptions
   * @param {Buffer|undefined} fileBuffer
   */
  metroBundler.transformFile = async (
    filePath,
    transformOptions,
    fileBuffer,
  ) => {
    // TODO: Explain what this is all about
    if (!fileBuffer) {
      if (getVirtualModuleByPath(filePath)) {
        // TODO: Don't regenerate the hole thing every time, cache it.
        const code = await getVirtualModuleByPath(filePath).getContent(
          ladleConfig,
          configFolder,
        );
        fileBuffer = Buffer.from(code);
      }
      // Patch stories
      // Copied and adapted from: vite-plugin.js
      else if (filePath.includes(".stories.")) {
        const { getSource } = await originalTransformFile(
          filePath,
          transformOptions,
          fileBuffer,
        );
        const code = getSource().toString();
        const from = cleanupWindowsPath(
          path.join(projectRoot, "src/story-hmr"),
        );
        const watcherImport = `import { storyUpdated } from "${from}";`;
        // if stories are defined through .bind({}) we need to force full reloads since
        // react-refresh can't pick it up
        // const invalidateHmr = code.includes(".bind({})")
        //   ? `if (import.meta.hot) {
        //   import.meta.hot.on("vite:beforeUpdate", () => {
        //     import.meta.hot.invalidate();
        //   });
        // }`
        //   : "";

        // make sure the `loaded` attr is set even if the story is loaded through iframe
        const setLoadedAttr = `typeof window !== 'undefined' &&
          window.document &&
          window.document.createElement && document.documentElement.setAttribute("data-storyloaded", "");`;

        fileBuffer = Buffer.from(
          `${code}\n${setLoadedAttr}\n${watcherImport}\nif (module.hot) {
          module.hot.accept(() => {
            storyupdated();
          });
        }`,
        );
      }
    }

    return originalTransformFile(filePath, transformOptions, fileBuffer);
  };

  return { metroServer, metroBundler };
};

export default metroDev;
