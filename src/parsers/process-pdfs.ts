import { FileSystem } from "@effect/platform";
import { Effect, Console } from "effect";

import { extractTextFromBuffer } from "../services/extract-text.js";
import { parseCreditNote } from "./parse-credit-note.js";
import { parseTaxInvoice } from "./parse-tax-invoice.js";

export const processPdfs = (pdfFiles: string[]) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    return yield* Effect.all(
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
            yield* Console.error(`Error parsing ${file}:`, parseAttempt.left);
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
  });
