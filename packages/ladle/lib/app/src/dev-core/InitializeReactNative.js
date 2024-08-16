/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import "virtual:inject-env-vars";
import "./effects";
import { loadBundleAsync } from "./asyncRequire";

if (__DEV__) {
  global[`${global.__METRO_GLOBAL_PREFIX__ ?? ""}__loadBundleAsync`] =
    loadBundleAsync;
}
