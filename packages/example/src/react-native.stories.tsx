import { Image } from "react-native";
// @ts-ignore
import LadleSvg from "./resources/ladle.svg";
// @ts-ignore
import ReactLogo from "./resources/react.png";

export function ShouldResolveImage() {
  return <Image source={ReactLogo} />;
}

export function ShouldResolveSvg() {
  return <LadleSvg width={50} height={50} />;
}
