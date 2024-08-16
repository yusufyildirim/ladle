import build from "@ladle/react/build";

build({
  port: 61105,
  host: "localhost",
  storyOrder: ["hello--world", "hello--ayo"],
});
