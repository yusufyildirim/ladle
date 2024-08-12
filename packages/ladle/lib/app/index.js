import "./InitializeReactNative";
import { AppRegistry } from "react-native";
import App from "./src/app.tsx";

console.log("hey");
AppRegistry.registerComponent("main", () => App);
const rootTag = document.getElementById("ladle-root");
AppRegistry.runApplication("main", {
  rootTag,
});
