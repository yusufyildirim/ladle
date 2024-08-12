import { View, Text, AppRegistry } from "react-native";

// Taken from "npm:expo/AppEntry.js" to fix broken "package.main"
// in Expo template when used in npm workspaces
// import { registerRootComponent } from "expo";

AppRegistry.registerComponent(() => (
  <View>
    <Text>Test!</Text>
  </View>
));
