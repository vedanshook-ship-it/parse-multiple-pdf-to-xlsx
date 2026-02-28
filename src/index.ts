import { Effect, Console } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";

import { ensureAssetsExtracted } from "./services/ensure-assets.js";
import { processPdfs } from "./parsers/process-pdfs.js";
import { generateXlsx } from "./services/generate-xlsx.js";
import { generateText } from "./services/generate-text.js";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  // Configuration
  const assetPath =
    "./src/assets/tmp601072_2025-06-01_2025-06-30_TAX_INVOICE.zip";
  const extractPath = "./src/outputs/extracted";

  // 1. Setup
  yield* ensureAssetsExtracted(assetPath, extractPath);

  // 2. Get Files
  const allFiles = yield* fs.readDirectory(extractPath);
  const pdfFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".pdf"));
  yield* Console.log(`Processing ${pdfFiles.length} PDFs...`);

  // ** Generate Text data for reference **
  // yield* generateText(pdfFiles);

  // 3. Process & Generate
  const results = yield* processPdfs(pdfFiles);
  yield* generateXlsx(results);

  yield* Console.log("All tasks complete!");
});

// Run with Global Error Handling
program.pipe(
  Effect.provide(NodeContext.layer),
  Effect.catchAll((err) => Console.error(` Critical Error: ${err}`)),
  NodeRuntime.runMain,
);
