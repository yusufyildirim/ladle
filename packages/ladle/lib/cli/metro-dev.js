/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import fs from "fs";
import { parse } from "url";
import { Buffer } from "buffer";
import path from "path";
import getPort from "get-port";

import { runServer } from "./runServer-fork.js";
import openBrowser from "./open-browser.js";
import { getBaseMetroConfig } from "./metro-base.js";
import { getVirtualModuleByPath } from "./metro-virtual-mods.js";
import {
  createHTMLTemplate,
  getExtraHeaderStuff,
} from "./metro/prepare-assets.js";
import { globby } from "globby";
import { getMetaJsonString } from "./vite-plugin/generate/get-meta-json.js";
import { getEntryData } from "./vite-plugin/parse/get-entry-data.js";
import {
  appRoot,
  createBundleUrlPath,
  projectPublicDir,
  projectRoot,
} from "./metro/utils.js";
import importFrom from "import-from";
import cleanupWindowsPath from "./vite-plugin/generate/cleanup-windows-path.js";
const express = importFrom(projectRoot, "express");

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
    const html = createHTMLTemplate({
      appendToHead: getExtraHeaderStuff(ladleConfig, configFolder),
      assets: [{ type: "css", filename: "assets/ladle.css" }],
      // TODO: Shouldn't be hardcoded
      bundleUrl: createBundleUrlPath({
        mainModuleName: "ladle",
        lazy: true,
        dev: true,
        platform: "web",
      }),
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
  const { metroServer } = await runServer(metroConfig, {
    host: hostname,
    unstable_extraMiddleware: [
      // Serve static assets from project's /public dir
      express.static(projectPublicDir, { index: false }),

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
    }

    return originalTransformFile(filePath, transformOptions, fileBuffer);
  };

  return { metroServer, metroBundler };
};

export default metroDev;
