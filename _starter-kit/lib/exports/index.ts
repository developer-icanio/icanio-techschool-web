// Registry of marketplace bulk-upload export generators, keyed by
// channel — /admin/master-data's "Generate" button and the export route
// both go through this, so adding Flipkart/Ajio/etc. later is just
// another lib/exports/<channel>.ts file plus one entry here, no changes
// to the route or the UI's plumbing.

import { buildMyntraRows, MYNTRA_HEADERS, MYNTRA_SECTION_ROW, MYNTRA_VERSION_ROW, MYNTRA_SHEET_NAME } from "./myntra";
import { buildAmazonAoa, AMAZON_SHEET_NAME } from "./amazon";

export interface ExportChannelConfig {
  label: string;
  sheetName: string;
  buildAoa: (parentSkus: string[]) => Promise<(string | number)[][]>;
}

export const EXPORT_CHANNELS: Record<string, ExportChannelConfig> = {
  amazon: {
    label: "Amazon (SHIRT)",
    sheetName: AMAZON_SHEET_NAME,
    buildAoa: buildAmazonAoa,
  },
  myntra: {
    label: "Myntra (T-Shirts)",
    sheetName: MYNTRA_SHEET_NAME,
    buildAoa: async (skus) => {
      const rows = await buildMyntraRows(skus);
      return [
        MYNTRA_VERSION_ROW,
        MYNTRA_SECTION_ROW.map((v) => v ?? ""),
        [...MYNTRA_HEADERS],
        ...rows,
      ];
    },
  },
};
