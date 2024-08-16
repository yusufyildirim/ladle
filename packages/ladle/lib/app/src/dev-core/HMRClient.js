/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import MetroHMRClient from "metro-runtime/src/modules/HMRClient";
import getDevServer from "./getDevServer";

const pendingEntryPoints = [];
let hmrUnavailableReason = null;

let hmrClient;

const HMRClient = {
  setup() {
    const serverScheme = window.location.protocol === "https:" ? "wss" : "ws";
    hmrClient = new MetroHMRClient(
      `${serverScheme}://${window.location.host}/hot`,
    );

    const { fullBundleUrl } = getDevServer();
    pendingEntryPoints.push(
      // HMRServer understands regular bundle URLs, so prefer that in case
      // there are any important URL parameters we can't reconstruct from
      // `setup()`'s arguments.
      fullBundleUrl,
    );

    hmrClient.on("connection-error", (e) => {
      console.log("HMR Can't connect to Metro");
    });

    hmrClient.on("update-start", ({ isInitialUpdate }) => {
      // console.log("HMR Update start", isInitialUpdate)
    });

    hmrClient.on("update", ({ isInitialUpdate }) => {
      // console.log("HMR Update", isInitialUpdate)
    });

    hmrClient.on("update-done", () => {
      // console.log("HMR Update done")
    });

    hmrClient.on("error", () => {
      // console.log("HMR Error", data)
    });

    hmrClient.on("close", () => {
      console.log("HMR Disconnected from Metro");
    });

    hmrClient.enable();

    HMRClient.registerBundleEntryPoints();
  },
  /**
   * @param {string} requestUrl string
   */
  registerBundle(requestUrl) {
    // assert(hmrClient, 'Expected HMRClient.setup() call at startup.');
    pendingEntryPoints.push(requestUrl);
    HMRClient.registerBundleEntryPoints(hmrClient);
  },

  registerBundleEntryPoints() {
    if (hmrUnavailableReason != null) {
      console.log("Bundle Splitting – Metro disconnected");
      // DevSettings.reload('Bundle Splitting – Metro disconnected');
      return;
    }

    if (pendingEntryPoints.length > 0) {
      hmrClient.send(
        JSON.stringify({
          type: "register-entrypoints",
          entryPoints: pendingEntryPoints,
        }),
      );
      pendingEntryPoints.length = 0;
    }
  },
};

export default HMRClient;
