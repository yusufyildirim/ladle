import getStoryImports from "./get-story-imports.js";
import getStoryList from "./get-story-list.js";
import getStorySource from "./get-story-source.js";
import getConfigImport from "./get-config-import.js";
import getComponentsImport from "./get-components-import.js";

/**
 * @param entryData {import('../../../shared/types').EntryData}
 * @param configFolder {string}
 * @param config {import("../../../shared/types").Config}
 */
export const getGeneratedList = async (entryData, configFolder, config) => {
  return `
${getStoryImports(entryData)}
${getStoryList(entryData)}
${getComponentsImport(configFolder)}
${getStorySource(entryData, config.addons.source.enabled)}
export const errorMessage = '';\n
`;
};

/**
 * @param entryData {import('../../../shared/types').EntryData}
 * @param configFolder {string}
 * @param config {import("../../../shared/types").Config}
 */
export const getConfig = async (entryData, configFolder, config) => {
  return `
${await getConfigImport(configFolder, config)}
`;
};
