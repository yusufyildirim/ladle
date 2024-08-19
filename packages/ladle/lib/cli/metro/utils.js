import path from "path";
import { URLSearchParams, fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = process.cwd();
export const projectPublicDir = path.resolve(projectRoot, "./public");

export const appRoot = path.resolve(__dirname, "../../app");

/**
 * @typedef {Object} BundleOptions
 * @property {string} mainModuleName
 * @property {string} platform
 * @property {boolean} dev
 * @property {boolean} [minify]
 * @property {boolean} [inlineSourceMap]
 * @property {boolean} [lazy]
 */

/**
 *
 * @param {BundleOptions} options - The options for creating the bundle URL path.
 * @returns {string} The generated bundle URL path.
 */
export function createBundleUrlPath(options) {
  const queryParams = createBundleUrlSearchParams(options);
  return `/${encodeURI(options.mainModuleName.replace(/^\/+/, ""))}.bundle?${queryParams.toString()}`;
}

/**
 *
 * @param {BundleOptions} options - The options for creating the bundle URL path.
 * @returns {URLSearchParams} Query params
 */
export function createBundleUrlSearchParams(options) {
  const { platform, dev, minify, inlineSourceMap, lazy } = options;

  const queryParams = new URLSearchParams({
    platform: encodeURIComponent(platform),
    dev: String(dev),
  });

  // Lazy bundling must be disabled for bundle splitting to work.
  if (lazy) {
    queryParams.append("lazy", String(lazy));
  }

  if (inlineSourceMap) {
    queryParams.append("inlineSourceMap", String(inlineSourceMap));
  }

  if (minify) {
    queryParams.append("minify", String(minify));
  }

  return queryParams;
}
