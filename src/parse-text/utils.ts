export const groupItemsByHsn = (items: any[]) => {
  const grouped = items.reduce(
    (acc, item) => {
      // MASTER KEY: Only the HSN. Strip spaces to be safe.
      const groupKey = (item.item_hsn || "NA").trim();

      if (!acc[groupKey]) {
        acc[groupKey] = { ...item };
      } else {
        // 1. Sum Quantity: Treat 'NA' as 0 so math doesn't break
        const cleanQty = (v: string) => (v === "NA" ? 0 : Number(v) || 0);
        const totalQty =
          cleanQty(acc[groupKey].item_quantity) + cleanQty(item.item_quantity);

        // If the result is 0 but it was 'NA', we can keep 'NA', otherwise use the sum
        acc[groupKey].item_quantity =
          totalQty === 0 ? "NA" : totalQty.toString();

        // 2. Sum Numeric Values (using your existing cleanNum logic)
        const cleanNum = (val: string | number) =>
          Number(String(val).replace(/[^0-9.-]+/g, "")) || 0;

        acc[groupKey].item_grossAmount = (
          cleanNum(acc[groupKey].item_grossAmount) +
          cleanNum(item.item_grossAmount)
        ).toFixed(2);

        acc[groupKey].item_taxableValue = (
          cleanNum(acc[groupKey].item_taxableValue) +
          cleanNum(item.item_taxableValue)
        ).toFixed(2);

        acc[groupKey].item_total = (
          cleanNum(acc[groupKey].item_total) + cleanNum(item.item_total)
        ).toFixed(2);

        // 3. Combine Descriptions so you don't lose the "Other Charges" label
        if (!acc[groupKey].item_description.includes(item.item_description)) {
          acc[groupKey].item_description += ` + ${item.item_description}`;
        }
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  return Object.values(grouped);
};
