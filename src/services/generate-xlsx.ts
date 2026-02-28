import { FileSystem } from "@effect/platform";
import { Effect, Console } from "effect";
import * as XLSX from "xlsx";

export const generateXlsx = (rawResults: any[][]) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const allRows = rawResults.flat();
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

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    yield* fs.writeFile("./src/outputs/output.xlsx", excelBuffer);
    yield* Console.log(
      "Processing complete. File saved to ./src/outputs/output.xlsx",
    );
  });
