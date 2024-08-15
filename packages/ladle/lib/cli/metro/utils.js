import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const projectRoot = process.cwd();
export const projectPublicDir = path.resolve(projectRoot, "./public");

export const appRoot = path.resolve(__dirname, "../../app");
