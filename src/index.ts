import Admzip from "adm-zip";
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

function extractZip(assetPath: string) {
  try {
    const zip = new Admzip(assetPath);
    const zipEntries = zip.getEntries();
    console.log(`Found ${zipEntries.length} items.`);
    zip.extractAllTo("./src/assets/Extracted");
  } catch (error) {
    console.error("Extract Zip Error: ", error);
  }
}

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
