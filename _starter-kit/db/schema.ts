// db/schema.ts
// Drizzle ORM schema for a custom e-commerce site (Next.js + Postgres + Vercel)
// Install: npm i drizzle-orm pg
//          npm i -D drizzle-kit @types/pg

import {
  pgTable,
  pgEnum,
  serial,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------- ENUMS ----------

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);

// Narrows what an admin (role="admin" above) can reach inside /admin.
// Null means "owner" for backward compatibility — every admin account
// created before this column existed had full access, and should keep
// it without a manual backfill.
export const adminRoleEnum = pgEnum("admin_role", ["owner", "seo", "sales"]);

// ---------- USERS ----------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  passwordHash: text("password_hash"), // null if using OAuth-only auth
  role: userRoleEnum("role").notNull().default("customer"),
  adminRole: adminRoleEnum("admin_role"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_idx").on(table.email),
}));

export const addresses = pgTable("addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 50 }), // "Home", "Office"
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdx: index("addresses_user_idx").on(table.userId),
}));

// ---------- CATALOG ----------

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull(),
  parentId: uuid("parent_id"), // self-reference for subcategories
  description: text("description"),
  imageUrl: text("image_url"),
  // SEO content fields — populated from the Category SEO Content spreadsheet
  seoTitle: varchar("seo_title", { length: 255 }),
  metaDescription: text("meta_description"),
  shortDescription: text("short_description"),
  keyword: varchar("keyword", { length: 255 }), // primary target keyword for this category
  group: varchar("group", { length: 50 }), // e.g. "Baby", "Kids", "Boys", "Girls", "Women", "Men", "Uniform", "Year Based"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("categories_slug_idx").on(table.slug),
}));

// "finished_goods" — stock is a real number on productVariants.stock,
// deducted directly on sale. "order_based" — no finished stock exists;
// availability is derived from MIN(component stock) via
// productComponentMapping, and packing consumes the components instead.
// Defaults to "finished_goods" since every existing product already
// behaves that way (a stored per-variant stock count, no component
// mapping).
export const inventoryStrategyEnum = pgEnum("inventory_strategy", ["order_based", "finished_goods"]);

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  // Base/style code shared across this product's variants (e.g.
  // "LL-TS-KD-COT-CP90") — distinct from productVariants.sku, which is
  // the full per-variant SKU (style code + color/size suffix).
  sku: varchar("sku", { length: 100 }),
  inventoryStrategy: inventoryStrategyEnum("inventory_strategy").notNull().default("finished_goods"),
  description: text("description"),
  basePrice: numeric("base_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  isActive: boolean("is_active").notNull().default(true),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  // Primary target keyword for this product's SEO, same idea as
  // categories.keyword. Optional override — when unset, the product's
  // category keyword is used instead (see getProductsSeoOverview()).
  focusKeyword: varchar("focus_keyword", { length: 255 }),
  // Long-form buying-guide content (real markdown: headings, internal/
  // external links, lists, tables, an FAQ section) rendered on the
  // product page below the short description — same idea as Amazon's
  // A+ Content, distinct from `description` above which stays short and
  // unchanged. Also what the SEO engine scores content-depth rules
  // against (see productToBlogPostShape() in lib/seoReports.ts), since
  // it's the one field genuinely built to have that structure.
  richContent: text("rich_content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("products_slug_idx").on(table.slug),
  categoryIdx: index("products_category_idx").on(table.categoryId),
}));

// Variants handle size/color/etc — every purchasable unit is a variant
export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }).notNull(),
  optionsJson: jsonb("options_json").notNull(), // e.g. { "size": "M", "color": "Red" }
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: numeric("compare_at_price", { precision: 10, scale: 2 }), // for showing discounts
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  skuIdx: uniqueIndex("variants_sku_idx").on(table.sku),
  productIdx: index("variants_product_idx").on(table.productId),
}));

export const productImages = pgTable("product_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: varchar("alt_text", { length: 255 }),
  // Which color variant this photo is for. Null means it's shown
  // regardless of the selected color (e.g. a lifestyle/detail shot).
  color: varchar("color", { length: 50 }),
  position: integer("position").notNull().default(0),
}, (table) => ({
  productIdx: index("images_product_idx").on(table.productId),
}));

// ---------- CART ----------

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }), // null = guest cart
  sessionId: varchar("session_id", { length: 255 }), // for guest carts, tied to cookie
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  cartIdx: index("cart_items_cart_idx").on(table.cartId),
}));

// ---------- ORDERS ----------

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderNumber: varchar("order_number", { length: 30 }).notNull(), // human-friendly, e.g. ORD-2026-00001
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  status: orderStatusEnum("status").notNull().default("pending"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  shippingFee: numeric("shipping_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  couponCode: varchar("coupon_code", { length: 50 }), // the code redeemed, if any (see discounts table)
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  shippingAddressId: uuid("shipping_address_id").references(() => addresses.id),
  billingAddressId: uuid("billing_address_id").references(() => addresses.id),
  // Checkout today is guest-only with a single free-text address field
  // (no structured address book UI, no login requirement) — these carry
  // the contact/delivery info for orders that don't have a real
  // `addresses` row. Once checkout collects a structured address these
  // become redundant with shippingAddressId, not a replacement for it.
  guestName: varchar("guest_name", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 30 }),
  guestEmail: varchar("guest_email", { length: 255 }),
  guestAddressText: text("guest_address_text"),
  // Customer-requested date, not a promised/calculated ship date — set on
  // custom orders (see the custom-tshirt page) where turnaround varies by
  // design and print queue; null for every regular catalog order.
  requestedDeliveryDate: timestamp("requested_delivery_date"),
  paymentProvider: varchar("payment_provider", { length: 50 }), // "stripe", "razorpay"
  paymentIntentId: varchar("payment_intent_id", { length: 255 }),
  // Fulfillment/dispatch details, all filled in by the admin from
  // /admin/orders/[id] when an order is shipped — see lib/couriers.ts for
  // the courier list, and app/api/admin/orders/upload for how the two
  // document URLs get set (an R2 URL each: the courier shipping label and
  // the packing-slip / tax invoice, both A4).
  courierPartner: varchar("courier_partner", { length: 50 }),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  shippingLabelUrl: text("shipping_label_url"),
  invoiceUrl: text("invoice_url"),
  // Set by the daily abandoned-cart cron (app/api/cron/abandoned-carts)
  // once it emails a reminder for a still-"pending" order, so the same
  // cart is never reminded twice.
  cartReminderSentAt: timestamp("cart_reminder_sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  orderNumberIdx: uniqueIndex("orders_order_number_idx").on(table.orderNumber),
  userIdx: index("orders_user_idx").on(table.userId),
  statusIdx: index("orders_status_idx").on(table.status),
}));

// Snapshot product/variant data at time of purchase — never join back to
// products for historical orders, since prices/names can change later
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  variantOptionsJson: jsonb("variant_options_json"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  // Set only on a custom-tshirt line item — the customer's uploaded
  // design (an R2 URL, see app/api/custom-orders/upload) and any
  // instructions ("print on front, 4 inches wide", etc.). Null for every
  // regular catalog line item.
  customDesignUrl: text("custom_design_url"),
  customNotes: text("custom_notes"),
}, (table) => ({
  orderIdx: index("order_items_order_idx").on(table.orderId),
}));

// ---------- DISCOUNTS ----------

export const discounts = pgTable("discounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  description: varchar("description", { length: 255 }), // shown in the product page's Offers box
  type: varchar("type", { length: 20 }).notNull(), // "percentage" | "fixed"
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minOrderValue: numeric("min_order_value", { precision: 10, scale: 2 }),
  // Null = sitewide. Set to scope a code to one product's page copy
  // ("10% off this product") without fragmenting into a separate row per
  // product — most launch codes are sitewide, so this stays the exception.
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  // Enforced by checking (guestEmail/userId) against existing orders at
  // redemption time — see lib/discounts.ts validateDiscountCode().
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  startsAt: timestamp("starts_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => ({
  codeIdx: uniqueIndex("discounts_code_idx").on(table.code),
}));

// ---------- REVIEWS ----------

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5, enforce in app layer or CHECK constraint
  title: varchar("title", { length: 255 }),
  body: text("body"),
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  productIdx: index("reviews_product_idx").on(table.productId),
}));

// ---------- LEADS ----------

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "quote_sent",
  "call_scheduled",
  "won",
  "lost",
]);

// "general" = the plain /contact form. "quote_request" = the manufacturing
// "Get a Quote" CTAs on the Hero/FinalCTA/Footer, which is the primary
// B2B lead-gen path for the /manufacturing side of the site.
export const leadTypeEnum = pgEnum("lead_type", ["general", "quote_request"]);

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: leadTypeEnum("type").notNull().default("general"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  company: varchar("company", { length: 255 }),
  message: text("message"),
  source: varchar("source", { length: 255 }),
  status: leadStatusEnum("status").notNull().default("new"),
  notes: text("notes"),
  quoteSentAt: timestamp("quote_sent_at"),
  callScheduledAt: timestamp("call_scheduled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  emailIdx: index("leads_email_idx").on(table.email),
  statusIdx: index("leads_status_idx").on(table.status),
  createdAtIdx: index("leads_created_at_idx").on(table.createdAt),
}));

// ---------- REDIRECTS ----------

// Checked in proxy.ts on every non-admin, non-api request. "permanent"
// emits a 308 so search engines transfer link equity; "temporary" emits
// a 307 for redirects that might change again later.
export const redirectTypeEnum = pgEnum("redirect_type", ["permanent", "temporary"]);

export const redirects = pgTable("redirects", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourcePath: varchar("source_path", { length: 500 }).notNull(),
  destinationPath: varchar("destination_path", { length: 500 }).notNull(),
  type: redirectTypeEnum("type").notNull().default("permanent"),
  isActive: boolean("is_active").notNull().default(true),
  hitCount: integer("hit_count").notNull().default(0),
  lastHitAt: timestamp("last_hit_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  sourcePathIdx: uniqueIndex("redirects_source_path_idx").on(table.sourcePath),
}));

// ---------- LINK CHECKER ----------

// Internal links (blog-to-blog, blog-to-shop, etc.) resolve instantly
// against the known set of published routes. External links need real
// HTTP fetches and stay "pending" until a batch job works through them.
export const linkCheckStatusEnum = pgEnum("link_check_status", ["running", "completed"]);
export const linkTypeEnum = pgEnum("link_type", ["internal", "external"]);

export const linkCheckRuns = pgTable("link_check_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: linkCheckStatusEnum("status").notNull().default("running"),
  totalLinks: integer("total_links").notNull().default(0),
  checkedLinks: integer("checked_links").notNull().default(0),
  brokenCount: integer("broken_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const linkCheckResults = pgTable("link_check_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => linkCheckRuns.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceSlug: varchar("source_slug", { length: 500 }).notNull(),
  sourceTitle: varchar("source_title", { length: 500 }).notNull(),
  linkUrl: text("link_url").notNull(),
  linkType: linkTypeEnum("link_type").notNull(),
  // null until checked — external links start unchecked; internal links
  // are always checked immediately, so this is only null for a pending
  // external link.
  ok: boolean("ok"),
  httpStatus: integer("http_status"),
  errorMessage: text("error_message"),
  checkedAt: timestamp("checked_at"),
}, (table) => ({
  runIdIdx: index("link_check_results_run_id_idx").on(table.runId),
  pendingIdx: index("link_check_results_pending_idx").on(table.linkType, table.ok),
}));

// ---------- SEO REPORTS ----------

// A weekly-ish snapshot of the /admin/seo rule engine (lib/seo/analyzer.ts)
// run across every blog post, so score history can be plotted over time
// instead of only ever showing the current point-in-time audit.
export const seoReportStatusEnum = pgEnum("seo_report_status", ["running", "completed"]);

export const seoReportRuns = pgTable("seo_report_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: seoReportStatusEnum("status").notNull().default("running"),
  totalItems: integer("total_items").notNull().default(0),
  avgScore: integer("avg_score").notNull().default(0),
  excellentCount: integer("excellent_count").notNull().default(0),
  goodCount: integer("good_count").notNull().default(0),
  needsImprovementCount: integer("needs_improvement_count").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const seoReportItems = pgTable("seo_report_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  runId: uuid("run_id").notNull().references(() => seoReportRuns.id, { onDelete: "cascade" }),
  itemId: varchar("item_id", { length: 550 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  url: text("url").notNull(),
  overallScore: integer("overall_score").notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  passedRules: integer("passed_rules").notNull(),
  failedRules: integer("failed_rules").notNull(),
  rules: jsonb("rules").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  runIdIdx: index("seo_report_items_run_id_idx").on(table.runId),
  itemIdIdx: index("seo_report_items_item_id_idx").on(table.itemId),
}));

// ---------- EMAIL MARKETING ----------

// Every row gets a random unsubscribeToken at insert time so broadcast
// emails can link to a one-click unsubscribe with no login required.
export const subscriberStatusEnum = pgEnum("subscriber_status", ["active", "unsubscribed"]);

export const subscribers = pgTable("subscribers", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  status: subscriberStatusEnum("status").notNull().default("active"),
  source: varchar("source", { length: 255 }),
  unsubscribeToken: uuid("unsubscribe_token").defaultRandom().notNull(),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
  unsubscribedAt: timestamp("unsubscribed_at"),
}, (table) => ({
  emailIdx: uniqueIndex("subscribers_email_idx").on(table.email),
  tokenIdx: uniqueIndex("subscribers_token_idx").on(table.unsubscribeToken),
}));

// A record of each broadcast sent to the subscriber list — sends happen
// synchronously when triggered from the compose page, not a queue.
export const emailBroadcasts = pgTable("email_broadcasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  subject: varchar("subject", { length: 255 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  recipientCount: integer("recipient_count").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
});

// ---------- BLOG IMAGES ----------

// Tracks blog post images uploaded to Cloudflare R2 via the image-prompts
// admin tool. The blog post's own .mdx frontmatter/body (git-tracked)
// remains the source of truth for which image is actually wired into the
// live page — this table exists so the admin UI can show upload status
// per post without re-checking R2 on every page load, and so a slug can
// be re-uploaded (overwriting the object at the same key) without
// leaving orphaned rows behind.
export const blogImageTypeEnum = pgEnum("blog_image_type", ["cover", "content1", "content2"]);

export const blogImages = pgTable("blog_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  blogSlug: varchar("blog_slug", { length: 300 }).notNull(),
  imageType: blogImageTypeEnum("image_type").notNull(),
  objectKey: varchar("object_key", { length: 500 }).notNull(),
  url: text("url").notNull(),
  fileSize: integer("file_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  slugIdx: index("blog_images_slug_idx").on(table.blogSlug),
  slugTypeIdx: uniqueIndex("blog_images_slug_type_idx").on(table.blogSlug, table.imageType),
}));

// ---------- BACK-IN-STOCK NOTIFICATIONS ----------

// One row per (email, variant) request. The daily back-in-stock cron
// scans "pending" rows, checks live availability via the InventoryService
// (getAvailableStockBatch, so order-based products are handled), emails
// the shopper, and flips the row to "notified". Re-requesting the same
// variant after being notified resets the row to "pending" (see
// requestStockNotification's onConflictDoUpdate) rather than inserting a
// duplicate.
export const stockNotificationStatusEnum = pgEnum("stock_notification_status", [
  "pending",
  "notified",
]);

export const stockNotifications = pgTable("stock_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  status: stockNotificationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  notifiedAt: timestamp("notified_at"),
}, (table) => ({
  variantIdx: index("stock_notifications_variant_idx").on(table.variantId),
  statusIdx: index("stock_notifications_status_idx").on(table.status),
  emailVariantIdx: uniqueIndex("stock_notifications_email_variant_idx").on(table.email, table.variantId),
}));

// ---------- INVENTORY ----------

export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  codeIdx: uniqueIndex("warehouses_code_idx").on(table.code),
}));

// Unlike `type` (free text — new physical component kinds show up
// often enough that a migration per one would be annoying), this is a
// real enum: exactly two buckets exist for working-capital reporting,
// and "which of the two" is a judgment call worth making explicitly per
// component rather than guessed from its type string (a "polybag" or
// "hang tag" isn't unambiguously one or the other just from its name).
export const componentCategoryEnum = pgEnum("component_category", ["raw_material", "consumable"]);

// Generic component catalog — every raw material/part that gets combined
// into a virtual "order-based" product at packing time. `type` is a
// plain string (not an enum) so new component types (hang tags,
// polybags, care labels, ...) can be added without a schema migration.
// `attributes` carries whatever dimensions matter for that type (e.g.
// {color,size} for blank apparel; empty for a DTF print, whose SKU
// already is the design code).
export const components = pgTable("components", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }).notNull(),
  attributes: jsonb("attributes"),
  // raw_material = becomes physically part of the sellable product
  // (blanks, DTF prints). consumable = used in fulfilment but never
  // part of the product itself (packing covers, hang tags, polybags).
  // Defaults to raw_material — most of the catalog today (blanks + DTF)
  // really is that; a consumable has to be marked as one on purpose.
  category: componentCategoryEnum("category").notNull().default("raw_material"),
  // Raw material cost — what LAMBLILY pays per unit of this component
  // (e.g. one blank tee, one DTF print), not a finished product's price.
  // Nullable — most components won't have this recorded yet. This is
  // what makes componentStock.quantity actually mean something in ₹:
  // costPrice x quantity, summed across components, is real raw-material
  // working capital, since componentStock (unlike productMasterData vs.
  // storefront stock) is the one real, single source of truth for
  // on-hand quantity here.
  // scale 3, not 2 — a bulk-purchased component's real per-unit cost is
  // often a batch total divided out (e.g. ₹2,183 / 1,000 pieces =
  // ₹2.183 each) and routinely lands on a third decimal; rounding that
  // to ₹2.18 understates a large stock count's real value by a real,
  // avoidable amount (₹3 on 1,000 units here alone).
  costPrice: numeric("cost_price", { precision: 10, scale: 3 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  skuIdx: uniqueIndex("components_sku_idx").on(table.sku),
  typeIdx: index("components_type_idx").on(table.type),
}));

// Per-warehouse stock for a component. DTF stock is deliberately NOT
// split per color/size — a DTF component row IS the shared pool (e.g.
// "CP023"), so every product variant that maps to it draws from the
// same number, matching the rule that DTF stock is shared across every
// color/size that uses that design.
export const componentStock = pgTable("component_stock", {
  id: uuid("id").defaultRandom().primaryKey(),
  componentId: uuid("component_id").notNull().references(() => components.id, { onDelete: "cascade" }),
  warehouseId: uuid("warehouse_id").notNull().references(() => warehouses.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  componentWarehouseIdx: uniqueIndex("component_stock_component_warehouse_idx").on(table.componentId, table.warehouseId),
}));

// Which components (and how many of each) a given order-based product
// variant is assembled from at packing time — e.g. "Astronaut Cricket,
// Black, 5-6Y" maps to 1x [Blank Black 5-6Y] + 1x [DTF CP023].
export const productComponentMapping = pgTable("product_component_mapping", {
  id: uuid("id").defaultRandom().primaryKey(),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").notNull().references(() => components.id, { onDelete: "restrict" }),
  quantityRequired: integer("quantity_required").notNull().default(1),
}, (table) => ({
  variantComponentIdx: uniqueIndex("product_component_mapping_variant_component_idx").on(table.variantId, table.componentId),
  variantIdx: index("product_component_mapping_variant_idx").on(table.variantId),
}));

export const reservationStatusEnum = pgEnum("reservation_status", ["active", "consumed", "released", "expired"]);

// A soft hold on stock, not a stock mutation — getAvailableStock()
// subtracts the sum of "active" reservations from raw stock, so placing
// an order immediately reduces what shows as available without ever
// touching the underlying componentStock/productVariants.stock numbers.
// Real deduction only happens in consumeReservation() when an order is
// actually confirmed; releaseReservation() (manual cancel) and the
// expiry cron (unconfirmed orders past their TTL) just flip the status
// off "active" and the stock reappears as available automatically.
export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
  orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  status: reservationStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  variantStatusIdx: index("reservations_variant_status_idx").on(table.variantId, table.status),
  expiresAtIdx: index("reservations_expires_at_idx").on(table.expiresAt),
}));

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "purchase_in",
  "manufacturing_in",
  "sale_out",
  "adjustment_in",
  "adjustment_out",
]);

// A single append-only ledger covering purchase entries, manufacturing
// entries, sales deductions, and manual adjustments — one table with a
// `type` discriminator instead of four separate tables, since they're
// all the same shape (something changed a stock number, by how much,
// and why), and this is the history the deferred aging/fast-moving/
// dead-stock reports will need once there's real order volume.
export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  componentId: uuid("component_id").references(() => components.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  warehouseId: uuid("warehouse_id").references(() => warehouses.id, { onDelete: "set null" }),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  referenceType: varchar("reference_type", { length: 50 }),
  referenceId: uuid("reference_id"),
  note: text("note"),
  performedByUserId: uuid("performed_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  componentIdx: index("stock_movements_component_idx").on(table.componentId),
  variantIdx: index("stock_movements_variant_idx").on(table.variantId),
  createdAtIdx: index("stock_movements_created_at_idx").on(table.createdAt),
}));

// ---------- RELATIONS (for Drizzle's relational query API) ----------

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
  images: many(productImages),
  reviews: many(reviews),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  cartItems: many(cartItems),
}));

// Missing previously — needed so Drizzle's relational query API can infer
// the products <-> productImages join (the "many" side alone on products
// isn't enough; the reverse "one" side must also be explicitly declared).
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  shippingAddress: one(addresses, { fields: [orders.shippingAddressId], references: [addresses.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const componentsRelations = relations(components, ({ many }) => ({
  stock: many(componentStock),
  productMappings: many(productComponentMapping),
}));

export const componentStockRelations = relations(componentStock, ({ one }) => ({
  component: one(components, { fields: [componentStock.componentId], references: [components.id] }),
  warehouse: one(warehouses, { fields: [componentStock.warehouseId], references: [warehouses.id] }),
}));

export const productComponentMappingRelations = relations(productComponentMapping, ({ one }) => ({
  variant: one(productVariants, { fields: [productComponentMapping.variantId], references: [productVariants.id] }),
  component: one(components, { fields: [productComponentMapping.componentId], references: [components.id] }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  order: one(orders, { fields: [reservations.orderId], references: [orders.id] }),
  orderItem: one(orderItems, { fields: [reservations.orderItemId], references: [orderItems.id] }),
  variant: one(productVariants, { fields: [reservations.variantId], references: [productVariants.id] }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  component: one(components, { fields: [stockMovements.componentId], references: [components.id] }),
  variant: one(productVariants, { fields: [stockMovements.variantId], references: [productVariants.id] }),
  warehouse: one(warehouses, { fields: [stockMovements.warehouseId], references: [warehouses.id] }),
  performedBy: one(users, { fields: [stockMovements.performedByUserId], references: [users.id] }),
}));

// Static pages (About, Careers, Privacy Policy, etc.) have their SEO
// metadata hardcoded in each page.tsx's `metadata` export — there's no
// page-builder/CMS for them. This table lets the admin panel override
// just the title/description per path without touching source, read by
// each page's generateMetadata() (see lib/pageSeo.ts) and falling back to
// the hardcoded default when no row exists for that path.
export const pageSeo = pgTable("page_seo", {
  id: uuid("id").defaultRandom().primaryKey(),
  path: varchar("path", { length: 255 }).notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  pathIdx: uniqueIndex("page_seo_path_idx").on(table.path),
}));

// The homepage hero carousel — was hardcoded copy + CSS gradients in
// HeroBanner.tsx with no way to swap in real photography short of
// editing code (see git history). Admin-managed now: /admin/hero-banner
// lets an owner upload a real photo per slide (falls back to `gradient`,
// the same Tailwind gradient classes the old hardcoded slides used, when
// imageUrl is null) and reorder/activate slides without a deploy.
export const heroSlides = pgTable("hero_slides", {
  id: uuid("id").defaultRandom().primaryKey(),
  eyebrow: varchar("eyebrow", { length: 100 }).notNull(),
  headline: varchar("headline", { length: 255 }).notNull(),
  subheadline: text("subheadline"),
  ctaLabel: varchar("cta_label", { length: 100 }).notNull(),
  ctaHref: varchar("cta_href", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  gradient: varchar("gradient", { length: 255 }).notNull(),
  position: integer("position").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  positionIdx: index("hero_slides_position_idx").on(table.position),
}));

// ---------- MARKETPLACE LISTING MASTER DATA ----------
//
// LAMBLILY lists (or plans to list) the same catalog across several
// external marketplaces — Amazon first, Myntra/Flipkart/etc. to follow —
// each with its own bulk-upload template. Amazon's alone runs to 272
// columns per product type (see public/LAMBLILY SHIRT Bulk Upload.xlsm,
// Amazon Seller Central's real "Category Listings Report" template for
// product type SHIRT). Rather than hardcoding 272+ columns per channel
// and redoing this for every new marketplace, three tables cover it:
//
//   - marketplaceListingTemplateFields: the *shape* of one channel's
//     template — one row per column (label, machine attribute path,
//     position), tagged by channel + product type. Imported once per
//     template; a new channel just adds more rows here, no schema change.
//   - productMasterData: one row per SKU — the canonical, channel-agnostic
//     LAMBLILY master record (name, parent/child relationship, category,
//     color, size, price, weight, etc.), the fields every channel needs
//     and the ones most useful to query/filter on directly.
//   - productChannelListings: one row per (sku, channel) holding the full,
//     as-submitted field values for that channel (rawAttributes, keyed by
//     attribute path) — so nothing from the source template is lost even
//     when a field has no dedicated column on productMasterData, and the
//     same SKU can carry different values per marketplace once Myntra/
//     Flipkart data exists without overwriting the canonical master row.

export const marketplaceChannelEnum = pgEnum("marketplace_channel", [
  "amazon",
  "myntra",
  "flipkart",
  "ajio",
  "meesho",
  "other",
]);

export const ageRangeEnum = pgEnum("age_range", [
  "02-06 Years",
  "07-12 Years",
  "11-16 Years",
  "Adult Men",
  "Adult Women",
]);

export const marketplaceListingTemplateFields = pgTable("marketplace_listing_template_fields", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: marketplaceChannelEnum("channel").notNull(),
  productType: varchar("product_type", { length: 100 }).notNull(), // e.g. "SHIRT" (Amazon's product-type code)
  columnIndex: integer("column_index").notNull(), // 1-based position in the source template's data sheet
  label: varchar("label", { length: 255 }).notNull(), // human label, e.g. "Collar Style"
  attributePath: text("attribute_path").notNull(), // machine field, e.g. "collar_style[marketplace_id=...]#1.value"
  definition: text("definition"), // matched from the template's "Data Definitions" sheet, when present
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  channelTypeIdx: index("marketplace_template_fields_channel_type_idx").on(table.channel, table.productType),
  uniqueColumnIdx: uniqueIndex("marketplace_template_fields_unique_idx").on(
    table.channel,
    table.productType,
    table.columnIndex
  ),
}));

export const productMasterData = pgTable("product_master_data", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: varchar("sku", { length: 150 }).notNull(),
  parentSku: varchar("parent_sku", { length: 150 }),
  parentageLevel: varchar("parentage_level", { length: 20 }), // "Parent" | "Child"
  productType: varchar("product_type", { length: 100 }), // e.g. "SHIRT"
  itemName: text("item_name"),
  itemHighlight: text("item_highlight"),
  brand: varchar("brand", { length: 150 }),
  manufacturer: varchar("manufacturer", { length: 255 }),
  browseNodes: jsonb("browse_nodes"), // string[] of recommended category paths
  description: text("description"),
  bulletPoints: jsonb("bullet_points"), // string[]
  genericKeywords: text("generic_keywords"),
  style: varchar("style", { length: 150 }),
  department: varchar("department", { length: 100 }),
  targetGender: varchar("target_gender", { length: 50 }),
  ageRangeDescription: varchar("age_range_description", { length: 100 }),
  ageFrom: varchar("age_from", { length: 50 }), // e.g. "2 Years"
  ageTo: varchar("age_to", { length: 50 }), // e.g. "3 Years"
  sizeLabel: varchar("size_label", { length: 50 }), // derived, e.g. "02-03Y"
  color: varchar("color", { length: 100 }),
  colorMap: varchar("color_map", { length: 100 }), // Amazon's standardized color value
  material: varchar("material", { length: 150 }),
  pattern: varchar("pattern", { length: 100 }),
  collarStyle: varchar("collar_style", { length: 150 }),
  neckStyle: varchar("neck_style", { length: 100 }),
  sleeveType: varchar("sleeve_type", { length: 100 }),
  sleeveLengthDescription: varchar("sleeve_length_description", { length: 100 }),
  fitType: varchar("fit_type", { length: 100 }),
  careInstructions: text("care_instructions"),
  countryOfOrigin: varchar("country_of_origin", { length: 100 }),
  mrp: numeric("mrp", { precision: 10, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }),
  // What LAMBLILY actually pays to make/acquire one unit — not shown to
  // customers anywhere, admin-only. Distinct from mrp/sellingPrice (what
  // a customer pays): this is cost basis, for margin (sellingPrice -
  // purchasePrice) and inventory-value/working-capital tracking
  // (purchasePrice x stock on hand, once summed against real stock
  // counts, which live on the storefront's product_variants table, not
  // here). Nullable — no cost data exists for most designs yet.
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  // Per-unit fulfillment costs beyond the product's own purchase price —
  // together with purchasePrice these make up full landed cost, so real
  // profit (not just product margin) is sellingPrice minus all of them.
  // Same nullable/admin-editable pattern as purchasePrice: catalog-wide
  // defaults get bulk-set once real numbers exist, individually
  // overridable per design after that.
  packingCost: numeric("packing_cost", { precision: 10, scale: 2 }), // poly bag/courier cover
  labellingInvoiceCost: numeric("labelling_invoice_cost", { precision: 10, scale: 2 }),
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }),
  // Amazon/marketplace referral + closing fees — a % of selling price,
  // not a flat per-unit cost like the three above. Null until Leo
  // provides the real rate; left out of the profit calc until then
  // rather than assumed at 0 (0% would be misleadingly optimistic).
  ecommerceOperatorCharges: numeric("ecommerce_operator_charges", { precision: 10, scale: 2 }),
  itemWeightValue: numeric("item_weight_value", { precision: 10, scale: 2 }),
  itemWeightUnit: varchar("item_weight_unit", { length: 30 }),
  packageDimensions: jsonb("package_dimensions"), // {length, width, height, unit}
  fulfillmentQuantity: integer("fulfillment_quantity"),
  handlingTimeDays: integer("handling_time_days"),
  sourceChannel: marketplaceChannelEnum("source_channel").notNull().default("amazon"),
  attributes: jsonb("attributes").notNull(), // catch-all: every other populated field, keyed by human label
  // Admin-controlled visibility/availability toggle. Set per row — for a
  // Child (a specific color+size SKU) this is what "enable/disable a
  // color variant" flips in bulk (every size under that parent+color);
  // for a Parent this hides the whole design. Independent of the source
  // template — never touched by re-imports.
  isActive: boolean("is_active").notNull().default(true),
  // Which color's photos represent this design by default — on the admin
  // list thumbnail, and wherever else "the" product image is needed
  // before a customer picks a color. Defaults to White; changeable per
  // design from the color-variants section of /admin/master-data/[sku].
  // Only meaningful on a Parent row.
  primaryColor: varchar("primary_color", { length: 100 }).notNull().default("White"),
  // Coarse, admin-facing age/audience bucket for browsing & filtering in
  // /admin/master-data — distinct from (but informed by) the fine-grained
  // per-size isActive flags above. Null until an admin classifies the
  // design (or a backfill does, per a real age-range reference table —
  // see scripts/apply-age-range-restrictions.ts). Only meaningful on a
  // Parent row; set identically on its children for consistency.
  ageRange: ageRangeEnum("age_range"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  skuIdx: uniqueIndex("product_master_data_sku_idx").on(table.sku),
  parentSkuIdx: index("product_master_data_parent_sku_idx").on(table.parentSku),
}));

export const productChannelListings = pgTable("product_channel_listings", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Not a hard FK to productMasterData.sku — same loosely-coupled pattern
  // as blogImages.blogSlug above — so an import can land channel rows
  // before/without a master row existing yet, in either order.
  sku: varchar("sku", { length: 150 }).notNull(),
  channel: marketplaceChannelEnum("channel").notNull(),
  productType: varchar("product_type", { length: 100 }),
  rawAttributes: jsonb("raw_attributes").notNull(), // full source row: {attributePath: value}
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => ({
  skuIdx: index("product_channel_listings_sku_idx").on(table.sku),
  skuChannelIdx: uniqueIndex("product_channel_listings_sku_channel_idx").on(table.sku, table.channel),
}));

// Every design's real photo shoot comes in two ratios — a vertical crop
// for this website's own product pages, and a 1:1 square for Amazon's
// listing requirements — each shot in all 7 colors. Not just two labels:
// each (color, photoType) pair gets its own gallery of up to 7 photos
// (different angles/poses of that color), so a design tops out at
// 7 colors × 7 photos × 2 types = 98 images.
export const productPhotoTypeEnum = pgEnum("product_photo_type", ["website", "amazon"]);

// Product photography for a master-data design — scoped to the Parent
// SKU (one design), shared across all its color/size children, since a
// single admin-managed gallery per design is what /admin/master-data
// edits. `position` orders photos *within* one (sku, color, photoType)
// group (0-6), capped at 7 there by the upload route/UI, not the schema.
// `color` is set for an imported, color-specific photo and left null for
// a fully generic one added by hand through the admin UI.
export const productMasterImages = pgTable("product_master_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: varchar("sku", { length: 150 }).notNull(), // the Parent SKU this photo belongs to
  url: text("url").notNull(),
  color: varchar("color", { length: 100 }),
  photoType: productPhotoTypeEnum("photo_type").notNull().default("website"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  skuIdx: index("product_master_images_sku_idx").on(table.sku),
  skuColorTypeIdx: index("product_master_images_sku_color_type_idx").on(
    table.sku,
    table.color,
    table.photoType
  ),
}));
