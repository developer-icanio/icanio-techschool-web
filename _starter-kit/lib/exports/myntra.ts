// Builds rows for Myntra's "Tshirts" bulk-upload template (the actual
// file the seller shared: Myntra-Sku-Template-2026-09-06.xlsx) from our
// own master data — one output row per active color/size variant of
// each selected design.
//
// Field-by-field notes on where the data comes from, and the handful of
// fields with no real source in our system, are inline below. Two fields
// are a documented best-effort guess rather than real data (flagged
// loudly here and in the generated file's own values) because Myntra's
// dropdown for them has no direct equivalent in what we track:
//   - "Standard Size": Myntra's dropdown is adult apparel sizing
//     (XS/S/M/L/XL...), but this catalog sizes by child age (02-03Y...
//     15-16Y). AGE_TO_STANDARD_SIZE below is an ordinal guess, not a
//     confirmed Myntra sizing-chart mapping — get this checked against
//     Myntra's kids sizing guidance before a real upload.
//   - "season": Myntra requires exactly one of Spring/Summer/Fall/Winter;
//     our catalog is "All Season" cotton tees, so this defaults to
//     "Summer" as the closest fit, not a real classification.
//
// Left blank (no source data at all): GTIN, Importer address, Country Of
// Origin 2-5, AI Label, List View Name, styleNote, Multipack Set,
// Occasion, Fabric 2/3, Surface Styling, Print/Pattern Type, Pattern
// Coverage, Main Trend, Sleeve Styling, Body/Garment Size, Character,
// Sport Team, Players, Technology, Closure, Add-Ons, Sustainable, Theme,
// Stitch, Care for me, Collection Name, addedDate, Color Variant
// GroupId, styleId, and all 10 body-measurement columns (Bust/Chest/
// Front Length/etc.) — this catalog has no size-chart measurement data.

import { db } from "@/db";
import { productMasterData, productMasterImages } from "@/db/schema";
import { inArray, asc } from "drizzle-orm";

export const MYNTRA_SHEET_NAME = "Tshirts";
export const MYNTRA_VERSION_ROW = ["Version : 13"];
export const MYNTRA_SECTION_ROW: (string | null)[] = (() => {
  const row: (string | null)[] = new Array(96).fill(null);
  row[0] = "Business (Information required for Style Creation/Legal Compliance/Order Tracking)";
  row[33] = "Discoverability - Attributes required for Product Description and Cataloguing";
  row[79] = "Sizing - Mandatory Measurements";
  row[89] = "Imagery - Mandatory Image Angles";
  return row;
})();

export const MYNTRA_HEADERS = [
  "styleId", "styleGroupId", "vendorSkuCode", "vendorArticleNumber", "vendorArticleName", "brand",
  "Manufacturer Name and Address with Pincode", "Packer Name and Address with Pincode",
  "Importer Name and Address with Pincode", "Country Of Origin", "Country Of Origin2",
  "Country Of Origin3", "Country Of Origin4", "Country Of Origin5", "articleType", "Brand Size",
  "Standard Size", "is Standard Size present on Label", "Brand Colour (Remarks)", "GTIN", "HSN",
  "SKUCode", "MRP", "ISP", "AgeGroup", "Prominent Colour", "Second Prominent Colour",
  "Third Prominent Colour", "FashionType", "Usage", "Year", "season", "AI Label", "List View Name",
  "Product Details", "styleNote", "materialCareDescription", "sizeAndFitDescription",
  "productDisplayName", "tags", "addedDate", "Color Variant GroupId", "Fabric", "Sleeve Length",
  "Neck", "Pattern", "Fit", "Multipack Set", "Occasion", "Fabric 2", "Fabric 3", "Surface Styling",
  "Print or Pattern Type", "Pattern Coverage", "Main Trend", "Sleeve Styling", "Length",
  "Number of Pockets", "Wash Care", "Body or Garment Size", "Sport", "Character", "Sport Team",
  "Players", "Technology", "Weave Type", "Closure", "Add-Ons", "Sustainable", "Number of Items",
  "Net Quantity Unit", "Theme", "Stitch", "Features",
  "Contact Brand or Retailer for pre-sales product queries", "Care for me", "Collection Name",
  "Package Contains", "Net Quantity", "Bust ( Inches )", "Chest ( Inches )",
  "Front Length ( Inches )", "Across Shoulder ( Inches )", "Hips ( Inches )",
  "Sleeve-Length ( Inches )", "To Fit Bust ( Inches )", "To Fit Chest ( Inches )",
  "To Fit Waist ( Inches )", "Waist ( Inches )", "Front Image", "Side Image", "Back Image",
  "Detail Angle", "Look Shot Image", "Additional Image 1", "Additional Image 2",
] as const;

// Best-effort only — see file header note. Ages not listed fall back to
// the nearest bracket rather than leaving the (mandatory) field empty.
const AGE_TO_STANDARD_SIZE: Record<string, string> = {
  "02-03Y": "XXS",
  "03-04Y": "XS",
  "05-06Y": "S",
  "07-08Y": "M",
  "09-10Y": "L",
  "11-12Y": "XL",
  "13-14Y": "XXL",
  "15-16Y": "3XL",
};

function designCode(sku: string): string {
  return sku.match(/CP[0-9]+$/)?.[0] ?? sku;
}

function attr(attributes: unknown, label: string): string {
  if (!attributes || typeof attributes !== "object") return "";
  const v = (attributes as Record<string, unknown>)[label];
  if (v == null) return "";
  return Array.isArray(v) ? v.join(", ") : String(v);
}

export type MyntraRow = (string | number)[];

export async function buildMyntraRows(parentSkus: string[]): Promise<MyntraRow[]> {
  const parents = await db.query.productMasterData.findMany({
    where: inArray(productMasterData.sku, parentSkus),
  });

  const children = await db.query.productMasterData.findMany({
    where: inArray(productMasterData.parentSku, parentSkus),
    orderBy: asc(productMasterData.sizeLabel),
  });

  const images = await db.query.productMasterImages.findMany({
    where: inArray(productMasterImages.sku, parentSkus),
    orderBy: asc(productMasterImages.position),
  });

  const rows: MyntraRow[] = [];

  for (const parent of parents) {
    const parentImages = images.filter((i) => i.sku === parent.sku && i.photoType === "website");
    // 7 website-ratio slots line up 1:1 with Myntra's 7 image columns
    // (Front/Side/Back/Detail/LookShot/Additional1/Additional2).
    const imagesByColor = new Map<string, typeof parentImages>();
    for (const img of parentImages) {
      if (!img.color) continue;
      if (!imagesByColor.has(img.color)) imagesByColor.set(img.color, []);
      imagesByColor.get(img.color)!.push(img);
    }

    const materialCare = [attr(parent.attributes, "Fabric Type") || parent.material, parent.careInstructions]
      .filter(Boolean)
      .join(". ");
    const productDetails = [parent.description, ...(Array.isArray(parent.bulletPoints) ? (parent.bulletPoints as string[]) : [])]
      .filter(Boolean)
      .join(" ");
    const manufacturerContact = attr(parent.attributes, "Manufacturer Contact Information");
    const packerContact = attr(parent.attributes, "Packer Contact Information");
    const hsn = attr(parent.attributes, "External Product Information");

    const activeChildren = children.filter((c) => c.parentSku === parent.sku && c.isActive && c.color);

    for (const child of activeChildren) {
      const code = designCode(parent.sku);
      const colorImages = child.color ? imagesByColor.get(child.color) ?? [] : [];
      const imageUrl = (slot: number) => colorImages[slot]?.url ?? "";

      const row: MyntraRow = [
        "", // styleId - Myntra-assigned, not ours to set
        `${code}-${child.color}`, // styleGroupId - groups this color's sizes together
        child.sku, // vendorSkuCode
        child.sku, // vendorArticleNumber
        parent.itemName ?? "", // vendorArticleName
        parent.brand ?? "LAMBLILY", // brand
        manufacturerContact, // Manufacturer Name and Address with Pincode
        packerContact, // Packer Name and Address with Pincode
        "", // Importer Name and Address with Pincode
        parent.countryOfOrigin ?? "India", // Country Of Origin
        "", "", "", "", // Country Of Origin 2-5
        "Tshirts", // articleType
        child.sizeLabel ?? "", // Brand Size
        AGE_TO_STANDARD_SIZE[child.sizeLabel ?? ""] ?? "", // Standard Size - see file header
        "Yes", // is Standard Size present on Label
        child.color ?? "", // Brand Colour (Remarks)
        "", // GTIN - GTIN Exempt in this catalog
        hsn, // HSN
        child.sku, // SKUCode
        parent.mrp ?? "", // MRP
        parent.sellingPrice ?? "", // ISP
        "Kids-Unisex", // AgeGroup - this catalog's Target Gender/Department are both Unisex Kids
        child.color ?? "", // Prominent Colour
        "", "", // Second/Third Prominent Colour
        "Fashion", // FashionType - best-effort default, no source classification
        "Casual", // Usage
        String(new Date().getFullYear()), // Year
        "Summer", // season - see file header
        "", "", // AI Label, List View Name
        productDetails, // Product Details
        "", // styleNote
        materialCare, // materialCareDescription
        parent.fitType ? `${parent.fitType} Fit` : "", // sizeAndFitDescription
        parent.itemName ?? "", // productDisplayName
        parent.genericKeywords ?? "", // tags
        "", // addedDate
        "", // Color Variant GroupId
        parent.material ?? "", // Fabric
        parent.sleeveLengthDescription ?? "", // Sleeve Length
        parent.neckStyle ?? "", // Neck
        parent.pattern ?? "", // Pattern
        parent.fitType ?? "", // Fit
        "", "", "", "", // Multipack Set, Occasion, Fabric 2, Fabric 3
        "", "", "", "", "", // Surface Styling, Print/Pattern Type, Pattern Coverage, Main Trend, Sleeve Styling
        "", // Length
        attr(parent.attributes, "Number of Pockets"), // Number of Pockets
        parent.careInstructions ?? "", // Wash Care
        "", // Body or Garment Size
        attr(parent.attributes, "Sport Type"), // Sport
        "", "", "", "", // Character, Sport Team, Players, Technology
        attr(parent.attributes, "Compliance Weave Type"), // Weave Type
        "", "", "", // Closure, Add-Ons, Sustainable
        attr(parent.attributes, "Number of Items") || "1", // Number of Items
        attr(parent.attributes, "Unit Count Type") || "count", // Net Quantity Unit
        "", "", // Theme, Stitch
        attr(parent.attributes, "Features"), // Features
        manufacturerContact, // Contact Brand or Retailer for pre-sales product queries
        "", "", // Care for me, Collection Name
        "1 T-Shirt", // Package Contains
        attr(parent.attributes, "Item Package Quantity") || "1", // Net Quantity
        "", "", "", "", "", "", "", "", "", "", // 10 body-measurement columns - no size-chart data
        imageUrl(0), // Front Image
        imageUrl(1), // Side Image
        imageUrl(2), // Back Image
        imageUrl(3), // Detail Angle
        imageUrl(4), // Look Shot Image
        imageUrl(5), // Additional Image 1
        imageUrl(6), // Additional Image 2
      ];

      rows.push(row);
    }
  }

  return rows;
}
