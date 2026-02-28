import { Effect, Schema } from "effect";
import { FinalInvoiceSchema } from "../effect-schemas/invoice-schema.js";
import { groupItemsByHsn } from "./utils.js";
export const parseCreditNote = (text: string) =>
  Effect.gen(function* () {
    const find = (regex: RegExp) => text.match(regex)?.[1] ?? "N/A";

    const rawCreditNoteSchema = {
      type: "CREDIT_NOTE",
      orderNumber: find(/Order Number:\s*(\d+)/i),
      orderDate: find(/Order Date:\s*([\d\s-:]+)/i),
      creditNoteNo: find(/Credit Note No:\s*([a-zA-Z0-9]+)/i),
      creditNoteDate: find(/Credit Note Date:\s*([\d\s-:]+)/i),
      invoiceNoAndDate: find(
        /Invoice No and Date:\s*([a-zA-Z0-9]+\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/i,
      ),
    };

    const rawSoldBy = (() => {
      const block = find(/SOLD BY:\s*([\s\S]*?)(?=\s*GSTIN)/i) || "";
      const name = block.split(/\s+(?=[A-Z][a-z]+)/)[0]?.trim() || "N/A";
      return {
        soldBy_name: name,
        soldBy_address:
          block
            .replace(name, "")
            .replace(/^[,\s\n]+/, "")
            .trim() || "N/A",
        soldBy_gstin: find(/GSTIN\s*:\s*([A-Z0-9]{15})/i).trim(),
      };
    })();

    const rawBillTo = (() => {
      const block = find(/BILL TO:\s*([\s\S]*?)(?=\s*Place of Supply)/i) || "";
      const [name, ...addressParts] = block.split(",");
      return {
        billTo_name: (name || "N/A").trim(),
        billTo_address: addressParts.join(",").trim() || "N/A",
        billTo_placeOfSupply: find(
          /Place of Supply\s*:\s*(.*?)(?=\s*SHIP TO|$)/is,
        ).trim(),
      };
    })();

    const rawShipTo = (() => {
      const block = find(/SHIP TO:\s*([\s\S]*?)(?=\s+\bSN\b|$)/i) || "";
      const name = block.split(/\s+(?=\d)/)[0]?.trim() || "N/A";
      return {
        shipTo_name: name,
        shipTo_address:
          block
            .replace(name, "")
            .replace(/^[,\s\n]+/, "")
            .trim() || "N/A",
      };
    })();

    const tableData = (() => {
      const parts = text.split(/SN\.\s+Description/i);
      const tableBlock = parts[1] ?? "";

      // 2. Regex for standard item rows (Rows 1, 2, etc.)
      const rowRegex =
        /(\d+)\s+([\s\S]*?)\s+(\d{6}|NA)\s+(\d+|NA)\s+Rs\.?([\d,.]+)\s+(?:Rs\.?|)([\d,.]+)\s+Rs\.?([\d,.]+)\s+([\s\S]*?):Rs\.?([\d,.]+)\s+Rs\.?([\d,.]+)/g;

      const items = [];
      let match;

      while ((match = rowRegex.exec(tableBlock)) !== null) {
        items.push({
          item_sn: match[1] ?? "N/A",
          item_description: (match[2] ?? "").replace(/\s+/g, " ").trim(),
          item_hsn: match[3] ?? "NA",
          item_quantity: match[4] ?? "0",
          item_grossAmount: match[5] ?? "0",
          item_discount: match[6] ?? "0",
          item_taxableValue: match[7] ?? "0",
          item_taxes: `${(match[8] ?? "").trim()}: ${match[9] ?? "0"}`,
          item_total: match[10] ?? "0",
        });
      }

      // 3. Extract the Summary Total (the very last line of the table)
      // Matches "Total Rs.37.83 Rs.248"
      const totalLineMatch = tableBlock.match(
        /Total\s+Rs\.?([\d,.]+)\s+Rs\.?([\d,.]+)/i,
      );

      return {
        items,
        totalTaxSummary: totalLineMatch?.[1] ?? "0.00",
        grandTotal: totalLineMatch?.[2] ?? "0.00",
      };
    })();

    const groupedItems = groupItemsByHsn(tableData.items);
    const combinedData = {
      ...rawCreditNoteSchema,
      ...rawSoldBy,
      ...rawBillTo,
      ...rawShipTo,
      items: groupedItems,
      totalTaxSummary: tableData.totalTaxSummary,
      grandTotal: tableData.grandTotal,
    };

    // console.log(
    //   "DEBUG - Combined Data:",
    //   JSON.stringify(combinedData, null, 2),
    // );
    return yield* Schema.decodeUnknown(FinalInvoiceSchema)(combinedData);
  });
