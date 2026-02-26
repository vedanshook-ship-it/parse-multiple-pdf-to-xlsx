import { Effect, Console, pipe } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";

import { extractZip } from "./extractZip.js";
import { extractTextFromBuffer } from "./extractText.js";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const extractPath = "./src/outputs/Extracted";
  const assetPath =
    "./src/assets/tmp601072_2025-06-01_2025-06-30_TAX_INVOICE.zip";
  const outputPath = "./src/outputs/textData";

  const extractFolderExists = yield* fs.exists(extractPath);
  let isFolderEmpty = true;

  if (extractFolderExists) {
    const existingFiles = yield* fs.readDirectory(extractPath);
    isFolderEmpty = existingFiles.length === 0;
  }

  if (!extractFolderExists || isFolderEmpty) {
    yield* Console.log("Extracting Zip...");
    yield* Effect.sync(() => extractZip(assetPath));
  } else {
    yield* Console.log("Zip file is already extracted.");
  }

  yield* fs.makeDirectory(outputPath, { recursive: true });

  const allFiles = yield* fs.readDirectory(extractPath);
  const pdfFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".pdf"));

  yield* Console.log(`Found ${pdfFiles.length} PDFs to process.`);

  yield* Effect.all(
    pdfFiles.map((file, index) =>
      Effect.gen(function* () {
        const filePath = `./src/outputs/Extracted/${file}`;

        const buffer = yield* fs.readFile(filePath);

        const text = yield* extractTextFromBuffer(new Uint8Array(buffer));

        yield* Effect.gen(function* (){
          
        })

        const fileName = `file${index}.txt`;
        const individualFilePath = `./src/outputs/textData/${fileName}`;

        yield* fs.writeFileString(
          individualFilePath,
          text || `empty_file_${index}`,
        );
      }),
    ),
    { concurrency: "inherit" },
  );

  yield* Console.log("All files processed successfully.");


});

program.pipe(
  Effect.provide(NodeContext.layer),
  Effect.catchAll((err) => Console.error(`Critical Error: ${err}`)),
  NodeRuntime.runMain,
);
