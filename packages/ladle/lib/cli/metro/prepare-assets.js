/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import fs from "fs";
import path from "path";
import { appRoot } from "./utils.js";

/**
 * @param ladleConfig {import("../../shared/types").Config}
 * @param configFolder {string}
 */
export function getExtraHeaderStuff(ladleConfig, configFolder) {
  let appendToHead = "";

  const headHtmlPath = path.join(configFolder, "head.html");
  if (fs.existsSync(headHtmlPath)) {
    appendToHead = fs.readFileSync(headHtmlPath, "utf8");
  }
  if (ladleConfig.appendToHead) {
    appendToHead += ladleConfig.appendToHead;
  }

  return appendToHead;
}

function getBaseHTMLTemplate() {
  const template = fs
    .readFileSync(path.resolve(appRoot, "index.html"))
    .toString();
  return template;
}

export function createHTMLTemplate({ assets, bundleUrl, appendToHead }) {
  const template = getBaseHTMLTemplate();

  const styleString = assets
    .filter(({ type }) => type === "css")
    .map(
      ({ filename }) => `
          <link rel="preload" href="/${filename}" as="style">
          <link rel="stylesheet" href="/${filename}">

          `,
    )
    .join("");

  const scriptsString = `<script src="${bundleUrl}" defer></script>`;

  return template
    .replace("</head>", `${appendToHead}${styleString}</head>`)
    .replace("</body>", `${scriptsString}\n</body>`);
}
