import http from "http";
import c2k from "koa-connect";
import fs from "fs";
import { parse } from "url";
import { Buffer } from "buffer";

import { runServer } from "./runServer-fork.js";
import getPort from "get-port";
import { globby } from "globby";
import boxen from "boxen";

import openBrowser from "./open-browser.js";
import debug from "./debug.js";

import resolveFrom from "resolve-from";
import path from "path";
import { fileURLToPath } from "url";
import getAppRoot from "./get-app-root.js";
import { getEntryData } from "./vite-plugin/parse/get-entry-data.js";
import {
  getGeneratedList,
  getConfig,
} from "./vite-plugin/generate/get-generated-list.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @param config {import("../shared/types").Config}
 * @param configFolder {string}
 */
const generateStories = async (storiesFilePath, config, configFolder) => {
  const entryData = await getEntryData(
    await globby(
      Array.isArray(config.stories) ? config.stories : [config.stories],
    ),
  );
  const entryList = await getGeneratedList(entryData, configFolder, config);
  fs.writeFileSync(storiesFilePath, entryList);
};

const getlistModuleContent = async (storiesFilePath, config, configFolder) => {
  const entryData = await getEntryData(
    await globby(
      Array.isArray(config.stories) ? config.stories : [config.stories],
    ),
  );
  return getGeneratedList(entryData, configFolder, config);
};

const getConfigContent = async (storiesFilePath, config, configFolder) => {
  const entryData = await getEntryData(
    await globby(
      Array.isArray(config.stories) ? config.stories : [config.stories],
    ),
  );
  return getConfig(entryData, configFolder, config);
};

const bundler = async (config, configFolder) => {
  const appRoot = getAppRoot();
  const projectRoot = process.cwd();

  const listModuleFilePath = path.resolve(appRoot, "./stories.js");
  const configModulePath = path.resolve(appRoot, "./config.js");
  // const st = generateStories(listModuleFilePath, config, configFolder);

  const metroPath = resolveFrom(projectRoot, "metro");
  const Metro = await import(metroPath);

  // const port = await getPort({
  //   port: [config.port, 61001, 62002, 62003, 62004, 62005],
  // });
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

  // function ensureFileSystemPatched(fileSystem) {
  //   if (fileSystem.__patched) return;
  //
  //   const original_getSha1 = fileSystem.getSha1.bind(fileSystem);
  //
  //   fileSystem.getSha1 = (filename) => {
  //     if (filename.startsWith("\0")) {
  //       return filename;
  //     }
  //     return original_getSha1(filename);
  //   };
  //
  //   fileSystem.__patched = true;
  // }

  const listModuleName = "virtual:generated-list";
  const configModuleName = "virtual:config";

  const reactNativePath = resolveFrom(projectRoot, "react-native");
  const userMetroConfig = await Metro.loadConfig();

  const isVirtualModule = (modulePath) => {
    return modulePath.startsWith(modulePath, "\0");
  };

  const serializer = {
    ...userMetroConfig.serializer,

    getModulesRunBeforeMainModule() {
      return [
        // MUST be first
        import.meta.resolve(
          path.join(reactNativePath, "Libraries/Core/InitializeCore"),
        ),
        import.meta.resolve(
          path.join(projectRoot, "@ladle/react/InitalizeReactNative"),
        ),
      ];
    },
    // createModuleIdFactory() {
    //   const fileToIdMap = new Map();
    //   return (modulePath) => {
    //     let id = fileToIdMap.get(modulePath);
    //     if (id == null) {
    //       if (modulePath == null) {
    //         id = "MODULE_NOT_FOUND";
    //       } else if (isVirtualModule(modulePath)) {
    //         // Virtual modules should be stable.
    //         id = modulePath;
    //       } else if (path.isAbsolute(modulePath)) {
    //         id = path.relative(projectRoot, modulePath);
    //       } else {
    //         id = modulePath;
    //       }
    //       fileToIdMap.set(modulePath, id);
    //     }
    //     return id;
    //   };
    // },
  };
  let bundler = null;

  const metroConfig = {
    ...userMetroConfig,
    serializer,
    resolver: {
      ...(userMetroConfig.resolver || {}),
      resolveRequest(context, moduleName, platform) {
        if (moduleName === listModuleName) {
          // ensureFileSystemPatched(bundler._depGraph._fileSystem);

          // return {
          //   filePath: virtualModuleId,
          //   type: "sourceFile",
          // };

          return {
            filePath: listModuleFilePath,
            type: "sourceFile",
          };
        } else if (moduleName === configModuleName) {
          return {
            filePath: configModulePath,
            type: "sourceFile",
          };
        }

        // Fall back to standard resolution for other modules
        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };

  const { metroServer } = await runServer(metroConfig, {
    host: "localhost",
    port: 8081,
    unstable_extraMiddleware: [indexPageMiddleware],
  });
  bundler = metroServer.getBundler().getBundler();

  const originalTransformFile = bundler.transformFile.bind(bundler);
  bundler.transformFile = async (filePath, transformOptions, fileBuffer) => {
    if (!fileBuffer) {
      if (filePath === listModuleFilePath) {
        fileBuffer = Buffer.from(
          await getlistModuleContent(listModuleFilePath, config, configFolder),
        );
      } else if (filePath === configModulePath) {
        fileBuffer = Buffer.from(
          await getConfigContent(listModuleFilePath, config, configFolder),
        );
      }
    }
    // console.log("lets gooo", filePath, fileBuffer);
    return originalTransformFile(filePath, transformOptions, fileBuffer);
  };
};

export default bundler;
