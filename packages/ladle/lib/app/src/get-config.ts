import merge from "lodash.merge";
// import { config, stories } from "virtual:generated-list";
import defaultConfig from "../../shared/default-config";
import type { Config } from "../../shared/types";
import debug from "./debug";
import { sortStories } from "./story-name";
const config = {
  addons: {
    a11y: { enabled: true },
    control: { enabled: true, defaultState: {} },
    theme: { enabled: true, defaultState: "light" },
    mode: { enabled: true, defaultState: "full" },
    rtl: { enabled: true, defaultState: false },
    source: { enabled: true, defaultState: false },
    msw: { enabled: false },
    action: { enabled: true, defaultState: [] },
    ladle: { enabled: true },
    width: {
      enabled: true,
      options: { xsmall: 414, small: 640, medium: 768, large: 1024 },
      defaultState: 0,
    },
  },
  stories: "src/**/*.stories.{js,jsx,ts,tsx,mdx}",
  hotkeys: {
    search: ["/", "meta+p"],
    nextStory: ["alt+arrowright"],
    previousStory: ["alt+arrowleft"],
    nextComponent: ["alt+arrowdown"],
    previousComponent: ["alt+arrowup"],
    control: ["c"],
    darkMode: ["d"],
    fullscreen: ["f"],
    width: ["w"],
    rtl: ["r"],
    source: ["s"],
    a11y: ["a"],
  },
  i18n: {
    buildTooltip: '💡 Tip: Run "ladle preview" to check that the build works!',
  },
  storyOrder: "(stories) => stories",
};

if (Object.keys(config).length === 0) {
  debug("No custom config found.");
} else {
  if (config.storyOrder && typeof config.storyOrder === "string") {
    config.storyOrder = new Function("return " + config.storyOrder)();
  }
  debug(`Custom config found:`);
  debug(config);
}

// don't merge default width options
if (config?.addons?.width?.options) {
  defaultConfig.addons.width.options = {};
}
const mergedConfig: Config = merge(defaultConfig, config);
// if (mergedConfig.defaultStory === "") {
//   mergedConfig.defaultStory = sortStories(
//     Object.keys(stories),
//     mergedConfig.storyOrder,
//   )[0];
// }

// don't merge hotkeys
mergedConfig.hotkeys = {
  ...mergedConfig.hotkeys,
  ...config.hotkeys,
};

debug("Final config", mergedConfig);

export default mergedConfig;
