import { Effect } from "effect";

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const pdfjsPackagePath = require.resolve("pdfjs-dist/package.json");
const standardFontDataUrl = pathToFileURL(
  require("path").join(
    require("path").dirname(pdfjsPackagePath),
    "standard_fonts",
  ) + require("path").sep,
).href;

export const extractTextFromBuffer = (buffer: Uint8Array) =>
  Effect.promise(async () => {
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
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }

    return text;
  });