import { Effect, Schema } from "effect";
import { FinalTaxSchema } from "../effect-schemas/tax-schema.js";
import { groupItemsByHsn } from "./utils.js";

export const parseTaxInvoice = (text: string) =>
  Effect.gen(function* () {
    const find = (regex: RegExp) => text.match(regex)?.[1] ?? "N/A";

    const rawCreditNoteSchema = {
      type: "TAX_INVOICE",
      orderNumber: find(/Order Number\s+:?\s*(\d+)/i),
      orderDate: find(/Order Date\s+:?\s*([\d\s-:]+)/i),
      invoiceNumber: find(/Invoice Number\s+:?\s*([a-zA-Z0-9]+)/i),
      invoiceDate: find(/Invoice Date\s+:?\s*([\d\s-:]+)/i),
    };

    const rawSoldBy = (() => {
      const fullBlock =
        find(
          /Sold by\s*:?\s*([\s\S]*?)(?=\d{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1})/i,
        ) || "";

      const gstinMatch =
        find(/([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1})/i) ||
        "N/A";

      const lines = fullBlock
        .split(/\n|,/)
        .map((l) => l.trim())
        .filter(Boolean);

      const name = lines[0] || "N/A";

      const address = lines.slice(1).join(", ").trim() || "N/A";

      return {
        soldBy_name: name,
        soldBy_address: address,
        soldBy_gstin: gstinMatch,
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

      // 1. Guard clause
      if (parts.length < 2)
        return { items: [], totalTaxSummary: "0", grandTotal: "0" };

      // 2. Lock the value into a const.
      // TS now knows 'tablePart' is a string, not 'string | undefined'
      const tablePart = parts[1] ?? "";

      // 3. Perform the second split on the confirmed string
      const tableBlock = tablePart.split(/Terms & Conditions/i)[0] ?? "";

      const rowRegex =
        /(\d+)\s+([\s\S]*?)\s+(\d{6}|NA)\s+(\d+|NA)\s+(?:Rs\.?\s*)?([\d,.]+)\s+(?:Rs\.?\s*)?([\d,.]+)\s+(?:Rs\.?\s*)?([\d,.]+)\s+([\s\S]*?)\s*:\s*(?:Rs\.?\s*)?([\d,.]+)\s+(?:Rs\.?\s*)?([\d,.]+)/g;

      const items = [];
      let match: RegExpExecArray | null;

      while ((match = rowRegex.exec(tableBlock)) !== null) {
        items.push({
          item_sn: match[1] ?? "N/A",
          item_description: (match[2] ?? "").replace(/\s+/g, " ").trim(),
          item_hsn: match[3] ?? "NA",
          item_quantity: match[4] ?? "0",
          item_grossAmount: match[5] ?? "0",
          item_discount: match[6] ?? "0",
          item_taxableValue: match[7] ?? "0",
          item_taxes: `${(match[8] ?? "Tax").trim()}: ${match[9] ?? "0"}`,
          item_total: match[10] ?? "0",
        });
      }

      const totals = [
        ...tableBlock.matchAll(
          /(?:Total\s+)(?:Rs\.?\s*)?([\d,.]+)\s+(?:Rs\.?\s*)?([\d,.]+)/gi,
        ),
      ];
      const lastTotalRow = totals[totals.length - 1];

      return {
        items,
        totalTaxSummary: lastTotalRow?.[1] ?? "0.00",
        grandTotal: lastTotalRow?.[2] ?? "0.00",
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
    return yield* Schema.decodeUnknown(FinalTaxSchema)(combinedData);
  });
