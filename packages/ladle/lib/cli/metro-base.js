/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import importFrom from "import-from";
import path from "path";
import resolveFrom from "resolve-from";
import { getVirtualModuleByName } from "./metro-virtual-mods.js";
import { fileURLToPath } from "url";
import copyMswWorker from "./copy-msw-worker.js";
import { projectPublicDir } from "./metro/utils.js";

const projectRoot = process.cwd();
const Metro = importFrom(projectRoot, "metro");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const entryFilePath = path.join(__dirname, "../app/src/index.tsx");

/**
 * @param {number | undefined} [port]
 */
export async function getBaseMetroConfig(port, ladleConfig) {
  process.env["BASE_URL"] = process.env["BASE_URL"] || "/";

  const reactNativePath = resolveFrom(projectRoot, "react-native");
  const userMetroConfig = await Metro.loadConfig();

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
  };

  if (ladleConfig.addons.msw.enabled) {
    copyMswWorker(projectPublicDir);
  }

  return {
    ...userMetroConfig,
    watchFolders: [
      ...userMetroConfig.watchFolders,
      path.resolve(__dirname, "../app"),
    ],
    server: {
      ...userMetroConfig.server,
      port,
    },
    serializer,
    resolver: {
      ...(userMetroConfig.resolver || {}),
      /**
       * @param {any} context
       * @param {string} moduleName
       * @param {string} platform
       */
      resolveRequest(context, moduleName, platform) {
        if (getVirtualModuleByName(moduleName)) {
          return {
            type: "sourceFile",
            filePath: getVirtualModuleByName(moduleName).path,
          };
        }

        // Fall back to standard resolution for other modules
        return context.resolveRequest(context, moduleName, platform);
      },
    },
  };
}
