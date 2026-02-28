import { Effect, Console } from "effect";
import { FileSystem } from "@effect/platform";
import { extractZip } from "./extract-zip.js";


export const ensureAssetsExtracted = (assetPath: string, extractPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const exists = yield* fs.exists(extractPath);

    const isFolderEmpty = exists
      ? (yield* fs.readDirectory(extractPath)).length === 0
      : true;

    if (isFolderEmpty) {
      yield* Console.log("Extracting Zip...");
      yield* Effect.sync(() => extractZip(assetPath));
    } else {
      yield* Console.log("Assets already present, skipping extraction.");
    }
  });
