import "./effects";
import { loadBundleAsync } from "./asyncRequire";

global[`${global.__METRO_GLOBAL_PREFIX__ ?? ""}__loadBundleAsync`] =
  loadBundleAsync;
