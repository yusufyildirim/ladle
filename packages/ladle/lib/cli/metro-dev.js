import fs from "fs";
import { parse } from "url";
import { Buffer } from "buffer";
import path from "path";
import { fileURLToPath } from "url";
import getPort from "get-port";

import { runServer } from "./runServer-fork.js";
import openBrowser from "./open-browser.js";
import { getBaseMetroConfig } from "./metro-base.js";
import { getVirtualModuleByPath } from "./metro-virtual-mods.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param ladleConfig {import("../shared/types").Config}
 * @param configFolder {string}
 */
const bundler = async (ladleConfig, configFolder) => {
  /**
   * Middleware for handling the index page request.
   * @param {import('express').Request} req - The Express request object.
   * @param {import('express').Response} res - The Express response object.
   * @param {import('express').NextFunction} next - The Express next middleware function.
   */
  function indexPageMiddleware(req, res, next) {
    const url = parse(req.url, true);
    const platformParam = url.query?.platform;

    const isBundlerRequest = platformParam === "web";
    const isAssetRequest = req.url === "/ladle.css";

    if (isBundlerRequest) return next();
    if (isAssetRequest) {
      res.setHeader("Content-Type", "text/css");
      res.end(fs.readFileSync(path.join(__dirname, "../app/ladle.css")));
      return next();
    }

    // Serve HTML
    res.setHeader("Content-Type", "text/html");
    res.end(fs.readFileSync(path.join(__dirname, "../app/index.html")));
    return next();
  }

  const port = await getPort({
    port: [ladleConfig.port, 61001, 62002, 62003, 62004, 62005],
  });
  // TODO: Support HTTPS
  const useHttps = false;
  const hostname = ladleConfig.host ?? "localhost";
  const serverUrl = `${useHttps ? "https" : "http"}://${hostname}:${port}`;

  const metroConfig = await getBaseMetroConfig(port);
  const { metroServer } = await runServer(metroConfig, {
    host: hostname,
    unstable_extraMiddleware: [indexPageMiddleware],
  });

  openBrowser(serverUrl);

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
    if (!fileBuffer) {
      if (getVirtualModuleByPath(filePath)) {
        const code = await getVirtualModuleByPath(filePath).getContent(
          ladleConfig,
          configFolder,
        );
        console.log(code);
        fileBuffer = Buffer.from(code);
      }
    }

    return originalTransformFile(filePath, transformOptions, fileBuffer);
  };
};

export default bundler;
