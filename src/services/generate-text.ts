import { Effect } from "effect";
import { FileSystem } from "@effect/platform";
import { extractTextFromBuffer } from "./extract-text.js";

export const generateText = (pdfFiles: string[]) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const outputDir = "./src/outputs/text-data";

    yield* fs.makeDirectory(outputDir, { recursive: true });

    yield* Effect.all(
      pdfFiles.map((file) =>
        Effect.gen(function* () {
          const filePath = `./src/outputs/extracted/${file}`;
          const buffer = yield* fs.readFile(filePath);
          const text = yield* extractTextFromBuffer(new Uint8Array(buffer));

          const baseName = file.replace(/\.pdf$/i, "");
          const outputPath = `${outputDir}/${baseName}.txt`;

          yield* fs.writeFileString(outputPath, text);
        }),
      ),
      { concurrency: 6 },
    );
  });
