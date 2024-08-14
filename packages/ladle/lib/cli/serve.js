#!/usr/bin/env node

import metroDev from "./metro-dev.js";
import debug from "./debug.js";
import applyCLIConfig from "./apply-cli-config.js";
import getAppId from "./get-app-id.js";

/**
 * @param params {import("../shared/types").CLIParams}
 */
const serve = async (params = {}) => {
  debug("Starting serve command");
  process.env["VITE_LADLE_APP_ID"] = getAppId();
  const { configFolder, config } = await applyCLIConfig(params);
  await metroDev(config, configFolder);
};

export default serve;
