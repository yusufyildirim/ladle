import { getEntryData } from "./vite-plugin/parse/get-entry-data.js";
import getAppRoot from "./get-app-root.js";
import {
  getConfig,
  getGeneratedList,
} from "./vite-plugin/generate/get-generated-list.js";
import { globby } from "globby";
import path from "path";

const appRoot = getAppRoot();

/**
 * @param ladleConfig {import("../shared/types").Config}
 * @param configFolder {string}
 */
const getListModuleContent = async (ladleConfig, configFolder) => {
  const entryData = await getEntryData(
    await globby(
      Array.isArray(ladleConfig.stories)
        ? ladleConfig.stories
        : [ladleConfig.stories],
    ),
  );
  return getGeneratedList(entryData, configFolder, ladleConfig);
};

/**
 * @param ladleConfig {import("../shared/types").Config}
 * @param configFolder {string}
 */
const getConfigModuleContent = async (ladleConfig, configFolder) => {
  const entryData = await getEntryData(
    await globby(
      Array.isArray(ladleConfig.stories)
        ? ladleConfig.stories
        : [ladleConfig.stories],
    ),
  );
  return getConfig(entryData, configFolder, ladleConfig);
};

export const virtualModules = {
  "virtual:generated-list": {
    path: path.resolve(appRoot, "./stories.js"),
    getContent: getListModuleContent,
  },
  "virtual:config": {
    path: path.resolve(appRoot, "./config.js"),
    getContent: getConfigModuleContent,
  },
  "virtual:inject-env-vars": {
    path: path.resolve(appRoot, "./env.js"),
    getContent: () => `
global.env = {
  BASE_URL: ${process.env.BASE_URL && `"${process.env.BASE_URL}"`},
  VITE_LADLE_APP_ID: "${process.env.VITE_LADLE_APP_ID}",
  VITE_PUBLIC_LADLE_THEME: "${process.env.VITE_PUBLIC_LADLE_THEME}",
}
`,
  },
};
export const virtualModulesByPath = Object.entries(virtualModules).reduce(
  (acc, [key, module]) => {
    acc[module.path] = { ...module, name: key };
    return acc;
  },
  {},
);
export const getVirtualModuleByName = (name) => virtualModules[name];
export const getVirtualModuleByPath = (path) => virtualModulesByPath[path];
