import { Effect, Console, pipe } from "effect";
import { FileSystem } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import * as XLSX from "xlsx";

import { extractZip } from "./extract-zip.js";
import { extractTextFromBuffer } from "./extract-text.js";
import { parseCreditNote } from "./parse-text/parse-credit-note.js";
import { parseTaxInvoice } from "./parse-text/parse-tax-invoice.js";

const program = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;

  const extractPath = "./src/outputs/extracted";
  const assetPath =
    "./src/assets/tmp601072_2025-06-01_2025-06-30_TAX_INVOICE.zip";
  const outputPath = "./src/outputs/text-data";

  // --- 1. Extraction Logic (Zip handling) ---
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

  // --- 2. Processing and Validation ---
  const results = yield* Effect.all(
    pdfFiles.map((file) =>
      Effect.gen(function* () {
        const filePath = `./src/outputs/extracted/${file}`;
        const buffer = yield* fs.readFile(filePath);
        const text = yield* extractTextFromBuffer(new Uint8Array(buffer));

        const isCreditNote = text.includes("Credit Note");

        const parseAttempt = isCreditNote
          ? yield* Effect.either(parseCreditNote(text))
          : yield* Effect.either(parseTaxInvoice(text));

        if (parseAttempt._tag === "Left") {
          yield* Console.error(`❌ Error parsing ${file}:`, parseAttempt.left);
          return [];
        }

        const data = parseAttempt.right;

        // --- VALIDATION LOGIC ---
        // Helper to turn currency strings (Rs.248.00) into numbers
        const cleanNum = (val: string | number) =>
          Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;

        // Sum up the 'item_total' from all grouped rows
        const calculatedSum = data.items.reduce(
          (acc, item) => acc + cleanNum(item.item_total),
          0,
        );
        const extractedGrandTotal = cleanNum(data.grandTotal);

        // Check if they match (using 1-rupee tolerance for rounding)
        const isMatch = Math.abs(calculatedSum - extractedGrandTotal) < 1;
        const status = isMatch
          ? "MATCH"
          : `MISMATCH (Diff: ${(calculatedSum - extractedGrandTotal).toFixed(2)})`;

        if (!isMatch) {
          yield* Console.error(
            `Total Mismatch in ${file}: Calc(${calculatedSum}) vs PDF(${extractedGrandTotal})`,
          );
        }

        // Map data to Flat Rows for Excel
        return data.items.map((item) => ({
          Type: data.type,
          "Order Number": data.orderNumber,
          "Order Date": data.orderDate,
          "Invoice/CN Number": isCreditNote
            ? (data as any).creditNoteNo
            : (data as any).invoiceNumber,
          "Party Name": data.billTo_name,
          "HSN Code": item.item_hsn,
          Description: item.item_description,
          Qty: item.item_quantity,
          "Taxable Value": item.item_taxableValue,
          Taxes: item.item_taxes,
          "Item Total": item.item_total,
          "Grand Total (PDF)": data.grandTotal,
          "Validation Status": status,
        }));
      }),
    ),
    { concurrency: 6 },
  );

  // --- 3. Sheet Generation ---
  const allRows = results.flat();
  const creditNoteRows = allRows.filter((r) => r.Type === "CREDIT_NOTE");
  const taxInvoiceRows = allRows.filter((r) => r.Type === "TAX_INVOICE");

  const wb = XLSX.utils.book_new();

  if (allRows.length > 0) {
    if (creditNoteRows.length > 0) {
      const ws1 = XLSX.utils.json_to_sheet(creditNoteRows);
      XLSX.utils.book_append_sheet(wb, ws1, "Credit Notes");
    }
    if (taxInvoiceRows.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(taxInvoiceRows);
      XLSX.utils.book_append_sheet(wb, ws2, "Tax Invoices");
    }
  } else {
    const wsEmpty = XLSX.utils.json_to_sheet([
      { status: "No valid data parsed" },
    ]);
    XLSX.utils.book_append_sheet(wb, wsEmpty, "Empty");
  }

  // --- 4. Final Write ---
  const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  yield* fs.writeFile("./src/outputs/output.xlsx", excelBuffer);
  yield* Console.log(
    "Processing complete. File saved to ./src/outputs/output.xlsx",
  );
});

program.pipe(
  Effect.provide(NodeContext.layer),
  Effect.catchAll((err) => Console.error(`Critical Error: ${err}`)),
  NodeRuntime.runMain,
);
