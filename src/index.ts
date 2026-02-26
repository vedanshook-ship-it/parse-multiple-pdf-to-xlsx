import { extractZip } from "./extractZip.js";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractTextFromBuffer } from "./extractText.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const extractPath = join(__dirname, "assets", "Extracted");
const assetPath = join(
  __dirname,
  "assets",
  "tmp601072_2025-06-01_2025-06-30_TAX_INVOICE.zip",
);
const outputPath = join(__dirname, "outputs", "textData");

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

if (!existsSync(outputPath)) {
  mkdirSync(outputPath, { recursive: true });
  const files = readdirSync(extractPath);

  const pdfFiles = files.filter((f) => f.endsWith(".pdf"));

  for (const [index, file] of pdfFiles.entries()) {
    const filePath = join(extractPath, file);

    console.log(`Reading: ${file}...`);

    const buffer = readFileSync(filePath);

    const text = await extractTextFromBuffer(new Uint8Array(buffer));

    const individualFilePath = join(outputPath, `file${index}.txt`);

    writeFileSync(individualFilePath, text || `empty_file_${index}`);

    console.log(`Saved: file${index}.txt`);
  }

  console.log("All files processed.");
}
