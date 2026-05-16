import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  uuid,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core"
import type { AdapterAccountType } from "next-auth/adapters"

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
})

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
)

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
})

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
)

// ─── Sepet: ürün / fiyat cache ───

export const products = pgTable(
  "product",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    barcode: text("barcode").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category"),
    imageUrl: text("imageUrl"),
    averagePrice: numeric("averagePrice", { precision: 10, scale: 2 }),
    lastFetchedAt: timestamp("lastFetchedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("product_barcode_idx").on(t.barcode)],
)

export const priceSnapshots = pgTable(
  "price_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    marketName: text("marketName").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    inStock: boolean("inStock").notNull().default(true),
    marketUrl: text("marketUrl"),
    priceModifiedAt: timestamp("priceModifiedAt", { mode: "date" }),
    capturedAt: timestamp("capturedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("price_snapshot_product_captured_idx").on(
      t.productId,
      t.capturedAt.desc(),
    ),
    index("price_snapshot_market_product_idx").on(t.marketName, t.productId),
  ],
)

// ─── Fiş OCR: receipts + items ───

export const receipts = pgTable(
  "receipt",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    marketName: text("marketName"),
    purchaseDate: timestamp("purchaseDate", { mode: "date" }),
    totalAmount: numeric("totalAmount", { precision: 10, scale: 2 }),
    imageUrl: text("imageUrl").notNull(),
    imageR2Key: text("imageR2Key").notNull(),
    ocrModel: text("ocrModel").notNull().default("gemini-2.5-flash"),
    bestSingleMarket: text("bestSingleMarket"),
    bestSingleTotal: numeric("bestSingleTotal", { precision: 10, scale: 2 }),
    potentialSavingsTL: numeric("potentialSavingsTL", {
      precision: 10,
      scale: 2,
    }),
    summaryJson: jsonb("summaryJson"),
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("receipt_user_created_idx").on(t.userId, t.createdAt.desc()),
  ],
)

export const receiptItems = pgTable(
  "receipt_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    receiptId: uuid("receiptId")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),
    rawName: text("rawName").notNull(),
    searchQuery: text("searchQuery"),
    quantity: numeric("quantity", { precision: 10, scale: 3 })
      .notNull()
      .default("1"),
    unit: text("unit").notNull().default("adet"),
    receiptUnitPrice: numeric("receiptUnitPrice", {
      precision: 10,
      scale: 2,
    }),
    receiptTotalPrice: numeric("receiptTotalPrice", {
      precision: 10,
      scale: 2,
    }),
    matchedBarcode: text("matchedBarcode"),
    matchedName: text("matchedName"),
    bestMarket: text("bestMarket"),
    bestPrice: numeric("bestPrice", { precision: 10, scale: 2 }),
    savingsTL: numeric("savingsTL", { precision: 10, scale: 2 }),
  },
  (t) => [index("receipt_item_receipt_idx").on(t.receiptId)],
)

// ─── Sepetlerim: doğal dil ile oluşturulup kaydedilen sepetler ───

export const baskets = pgTable(
  "basket",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    conversationId: uuid("conversationId").references(() => conversations.id, {
      onDelete: "set null",
    }),
    sourceToolCallId: text("sourceToolCallId"),
    name: text("name").notNull(),
    bestSingleMarket: text("bestSingleMarket"),
    bestSingleTotal: numeric("bestSingleTotal", { precision: 10, scale: 2 }),
    twoMarketSavingsTL: numeric("twoMarketSavingsTL", {
      precision: 10,
      scale: 2,
    }),
    summaryJson: jsonb("summaryJson"),
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("basket_user_created_idx").on(t.userId, t.createdAt.desc()),
    uniqueIndex("basket_conv_tool_idx").on(
      t.userId,
      t.conversationId,
      t.sourceToolCallId,
    ),
  ],
)

export const basketItems = pgTable(
  "basket_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    basketId: uuid("basketId")
      .notNull()
      .references(() => baskets.id, { onDelete: "cascade" }),
    rawName: text("rawName").notNull(),
    searchQuery: text("searchQuery").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 3 })
      .notNull()
      .default("1"),
    unit: text("unit").notNull().default("adet"),
    matchedBarcode: text("matchedBarcode"),
    matchedName: text("matchedName"),
    bestMarket: text("bestMarket"),
    bestPrice: numeric("bestPrice", { precision: 10, scale: 2 }),
  },
  (t) => [index("basket_item_basket_idx").on(t.basketId)],
)

// ─── Asistan: sohbet geçmişi ───

export const conversations = pgTable(
  "conversation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("conv_user_updated_idx").on(t.userId, t.updatedAt.desc())],
)

export const conversationMessages = pgTable(
  "conversation_message",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversationId")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    metadata: jsonb("metadata"),
    sequence: integer("sequence").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("msg_conv_seq_idx").on(t.conversationId, t.sequence)],
)
