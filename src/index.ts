import { extractZip } from "./extractZip.js";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const extractPath = join(__dirname, "assets", "Extracted");
const assetPath = join(
  __dirname,
  "assets",
  "tmp601072_2025-06-01_2025-06-30_TAX_INVOICE.zip",
);

// validate if the files exist or not then start the extraction process
if (existsSync(extractPath)) {
  const files = readdirSync(extractPath);
  if (files.length > 0) {
    console.log("Zip file is already extracted.");
  } else {
    extractZip(assetPath);
  }
} else {
  extractZip(assetPath);
}
