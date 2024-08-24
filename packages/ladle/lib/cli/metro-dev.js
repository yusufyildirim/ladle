/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { parse } from "url";
import { Buffer } from "buffer";
import getPort from "get-port";
import chokidar from "chokidar";
import fs from "fs";

import { runServer } from "./runServer-fork.js";
import openBrowser from "./open-browser.js";
import { getBaseMetroConfig } from "./metro-base.js";
import {
  getVirtualModuleByName,
  getVirtualModuleByPath,
} from "./metro-virtual-mods.js";
import {
  createHTMLTemplate,
  getExtraHeaderStuff,
} from "./metro/prepare-assets.js";
import { globby } from "globby";
import {
  getMetaJsonString,
  getMetaJsonObject,
} from "./vite-plugin/generate/get-meta-json.js";
import { getEntryData } from "./vite-plugin/parse/get-entry-data.js";
import {
  createBundleUrlPath,
  projectPublicDir,
  projectRoot,
} from "./metro/utils.js";
import importFrom from "import-from";
const express = importFrom(projectRoot, "express");

const generatedListMod = getVirtualModuleByName("virtual:generated-list");

/**
 * @param ladleConfig {import("../shared/types").Config}
 * @param configFolder {string}
 * @param [customMetroConfig] {Object}
 */
const metroDev = async (ladleConfig, configFolder, customMetroConfig) => {
  const storiesContent = fs.readFileSync(generatedListMod.path);
  /**
   * We serve our modules as virtual modules. Whenever a change occurs,
   * HMR server expects it as a file change. To make it aware of a potential
   * module invalidation, this function writes the same content over stories modules path.
   * This way, Metro applies the necessary changes to the client through HMR.
   */
  async function fakeWriteStories() {
    fs.writeFileSync(generatedListMod.path, storiesContent.toString());
  }

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
    const isAssetRequest = req.url.startsWith("/assets/?unstable_path");
    const isMetaFile = req.url === "/meta.json";

    if (isBundlerRequest) return next();
    if (isAssetRequest) return next();
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
    }

    // Serve HTML
    const html = createHTMLTemplate({
      appendToHead: getExtraHeaderStuff(ladleConfig, configFolder),
      assets: [],
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

  const metroConfig =
    customMetroConfig || (await getBaseMetroConfig(port, ladleConfig));

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

  let metroBundler = metroServer.getBundler().getBundler();
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

  if (ladleConfig.noWatch === false) {
    // trigger full reload when new stories are added or removed
    const watcher = chokidar.watch(ladleConfig.stories, {
      persistent: true,
      ignoreInitial: true,
    });
    let checkSum = "";
    const getChecksum = async () => {
      try {
        const entryData = await getEntryData(
          await globby(
            Array.isArray(ladleConfig.stories)
              ? ladleConfig.stories
              : [ladleConfig.stories],
          ),
        );
        const jsonContent = getMetaJsonObject(entryData);
        // loc changes should not grant a full reload
        Object.keys(jsonContent.stories).forEach((storyId) => {
          jsonContent.stories[storyId].locStart = 0;
          jsonContent.stories[storyId].locEnd = 0;
        });
        return JSON.stringify(jsonContent);
      } catch (e) {
        return checkSum;
      }
    };
    checkSum = await getChecksum();
    const invalidate = async () => {
      const newChecksum = await getChecksum();
      if (checkSum === newChecksum) return;
      checkSum = newChecksum;
      fakeWriteStories();
    };
    watcher
      .on("add", invalidate)
      .on("change", invalidate)
      .on("unlink", invalidate);
  }
  return { metroServer, metroBundler };
};

export default metroDev;
