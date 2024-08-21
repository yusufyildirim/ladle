import { Image } from "react-native";
import LadleSvg from "./resources/ladle.svg";
import ReactLogo from "./resources/react.png";

export function ShouldResolveImage() {
  return <Image source={ReactLogo} />;
}

export function ShouldResolveSvg() {
  return <LadleSvg width={50} height={50} />;
}
