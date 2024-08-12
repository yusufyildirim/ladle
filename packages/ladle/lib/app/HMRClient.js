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
      fullBundleUrl
    );

    hmrClient.on('connection-error', (e: Error) => {
      console.log("HMR Can't connect to Metro")
    });

    hmrClient.on('update-start', ({ isInitialUpdate }) => {
    console.log("HMR Update start", isInitialUpdate)
    });

    hmrClient.on('update', ({ isInitialUpdate }: { isInitialUpdate?: boolean }) => {
    console.log("HMR Update", isInitialUpdate)
    });

    hmrClient.on('update-done', () => {
    console.log("HMR Update done")
    });

    hmrClient.on('error', (data: { type: string; message: string }) => {
    console.log("HMR Error", data)
    });

    hmrClient.on('close', (closeEvent: { code: number; reason: string }) => {
      LoadingView.hide();

      // https://www.rfc-editor.org/rfc/rfc6455.html#section-7.4.1
      // https://www.rfc-editor.org/rfc/rfc6455.html#section-7.1.5
      const isNormalOrUnsetCloseReason =
        closeEvent == null ||
        closeEvent.code === 1000 ||
        closeEvent.code === 1005 ||
        closeEvent.code == null;
      console.log("HMR Disconnected from Metro");

    });

    hmrClient.enable();

    HMRClient.registerBundleEntryPoints();
  },
  registerBundle(requestUrl: string) {
    // assert(hmrClient, 'Expected HMRClient.setup() call at startup.');
    pendingEntryPoints.push(requestUrl);
    HMRClient.registerBundleEntryPoints(hmrClient);
  },

 registerBundleEntryPoints() {
  if (hmrUnavailableReason != null) {
      console.log("Bundle Splitting – Metro disconnected")
    // DevSettings.reload('Bundle Splitting – Metro disconnected');
    return;
  }

  if (pendingEntryPoints.length > 0) {
    hmrClient.send(
      JSON.stringify({
        type: 'register-entrypoints',
        entryPoints: pendingEntryPoints,
      }),
    );
    pendingEntryPoints.length = 0;
  }
}
};

export default HMRClient;
