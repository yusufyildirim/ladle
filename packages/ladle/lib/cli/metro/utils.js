import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = process.cwd();
export const projectPublicDir = path.resolve(projectRoot, "./public");

export const appRoot = path.resolve(__dirname, "../../app");

export function createBundleUrlPath(options) {
  const queryParams = createBundleUrlSearchParams(options);
  return `/${encodeURI(options.mainModuleName.replace(/^\/+/, ""))}.bundle?${queryParams.toString()}`;
}

export function createBundleUrlSearchParams(options) {
  const { platform, dev, minify, inlineSourceMap, lazy } = options;

  const queryParams = new URLSearchParams({
    platform: encodeURIComponent(platform),
    dev,
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
