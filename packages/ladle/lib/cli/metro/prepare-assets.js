import fs from "fs";
import path from "path";
import { appRoot } from "./utils.js";

function getBaseHTMLTemplate() {
  const template = fs
    .readFileSync(path.resolve(appRoot, "index.html"))
    .toString();
  return template;
}

export function createHTMLTemplate({ assets, bundleUrl }) {
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

  const scriptsString = `<script src="/${bundleUrl}" defer></script>`;

  return template
    .replace("</head>", `${styleString}</head>`)
    .replace("</body>", `${scriptsString}\n</body>`);
}
