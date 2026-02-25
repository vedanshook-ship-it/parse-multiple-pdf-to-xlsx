import Admzip from "adm-zip";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const assetPath = join(
  __dirname,
  "assets",
  "tmp601072_2025-06-01_2025-06-30_TAX_INVOICE.zip",
);

console.log("Asset Path: ", assetPath);
try {
  const zip = new Admzip(assetPath);
  const zipEntries = zip.getEntries();
  console.log(`Found ${zipEntries.length} items.`);
  zip.extractAllTo("./src/assets/Extracted");
  // Console names of the zip file
  //   zipEntries.forEach(entry => {
  //     console.log(`${entry.entryName}`)
  //   });
} catch (error) {
  console.error("Some Error", error);
}
