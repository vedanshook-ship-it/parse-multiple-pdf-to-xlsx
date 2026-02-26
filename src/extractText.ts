import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const path = require("path");

const pdfjsPackagePath = require.resolve("pdfjs-dist/package.json");
const standardFontDataUrl = pathToFileURL(
  path.join(path.dirname(pdfjsPackagePath), "standard_fonts") + path.sep,
).href;

export const extractTextFromBuffer = async (
  buffer: Uint8Array,
): Promise<string> => {
  const loadingTask = pdfjsLib.getDocument({
    data: buffer,
    standardFontDataUrl,
    disableFontFace: true,
    verbosity: 0,
  });

  const pdf = await loadingTask.promise;
  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    const pageText = content.items.map((item: any) => item.str || "").join(" ");

    text += pageText + "\n";
  }

  return text;
};
