import { Schema } from "effect";

const CreditNoteSchema = Schema.Struct({
  orderNumber: Schema.String,
  creditNoteNo: Schema.String,
  orderDate: Schema.String,
  creditNoteDate: Schema.String,
  invoiceNoAndDate: Schema.String,
});

const SoldBy = Schema.Struct({
  soldBy_name: Schema.String,
  soldBy_address: Schema.String,
  soldBy_gstin: Schema.String,
});

const BillTo = Schema.Struct({
  billTo_name: Schema.String,
  billTo_address: Schema.String,
  billTo_placeOfSupply: Schema.String,
});

const ShipTo = Schema.Struct({
  shipTo_name: Schema.String,
  shipTo_address: Schema.String,
});

const TableItems = Schema.Struct({
  item_sn: Schema.String,
  item_description: Schema.String,
  item_hsn: Schema.String,
  item_quantity: Schema.String,
  item_grossAmount: Schema.String,
  item_discount: Schema.String,
  item_taxableValue: Schema.String,
  item_taxes: Schema.String,
  item_total: Schema.String,
});

export const FinalInvoiceSchema = Schema.Struct({
  type: Schema.Literal("CREDIT_NOTE"),
  ...CreditNoteSchema.fields,
  ...SoldBy.fields,
  ...BillTo.fields,
  ...ShipTo.fields,
  items: Schema.Array(TableItems),
  grandTotal: Schema.String,
  totalTaxSummary: Schema.optional(Schema.String),
});
