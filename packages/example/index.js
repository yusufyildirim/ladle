import React from "react";
import { View } from "react-native";
import { registerRootComponent } from "expo";

import {
  ShouldResolveImage,
  ShouldResolveSvg,
} from "./src/react-native.stories";

function App() {
  return (
    <View>
      <ShouldResolveImage />
      <ShouldResolveSvg />
    </View>
  );
}

registerRootComponent(App);
