import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  uuid,
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

// ─── SepetIQ: ürün / fiyat cache ───

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
