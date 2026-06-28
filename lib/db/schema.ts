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
import type { ConversationStatus } from "@/lib/assistant/conversation-status"

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  // Google sağlayıcı fotoğrafı. customImage doluysa görüntülenen avatar onu
  // ezer; "Google'a dön" customImage'i null'lar.
  image: text("image"),
  customImage: text("customImage"),
  onboardingCompletedAt: timestamp("onboardingCompletedAt", { mode: "date" }),
  // ─── Konum tercihi ───
  // Kullanıcının haritada seçtiği konum + mesafe yarıçapı + dahil edilecek
  // market şubeleri (marketfiyati depo ID'leri). lat/lng dolu = konum mevcut.
  // selectedDepotIds, /search'e `depots` filtresi olarak geçer.
  locationLat: numeric("locationLat", { precision: 9, scale: 6 }),
  locationLng: numeric("locationLng", { precision: 9, scale: 6 }),
  locationDistance: integer("locationDistance"),
  locationLabel: text("locationLabel"),
  selectedDepotIds: jsonb("selectedDepotIds").$type<string[]>(),
  locationUpdatedAt: timestamp("locationUpdatedAt", { mode: "date" }),
  // ─── Kullanım katmanı (plan) ───
  // Aylık kotalar plan'a göre belirlenir (bkz. lib/usage/limits.ts). Mevcut
  // kullanıcılar 'free' default'u ile başlar; Pro'ya yükseltme Polar abonelik
  // webhook'larıyla set edilir (bkz. app/api/webhooks/polar).
  plan: text("plan").$type<"free" | "pro">().notNull().default("free"),
  // ─── Polar abonelik senkronizasyonu ───
  // `plan` tek doğruluk kaynağıdır; aşağıdaki alanlar Polar webhook'larıyla
  // senkronlanır ve yalnızca Abonelik panelini beslemek (durum, yenilenme tarihi)
  // ve müşteri portalını açmak içindir. Checkout sırasında externalCustomerId =
  // users.id geçilir, böylece Polar müşterisi bu hesaba bağlanır; polarCustomerId
  // ilk webhook'la yazılır. Yıllık/aylık ayrımı productId eşlemesinden gelir.
  polarCustomerId: text("polarCustomerId"),
  polarSubscriptionId: text("polarSubscriptionId"),
  subscriptionStatus: text("subscriptionStatus"),
  subscriptionInterval: text("subscriptionInterval").$type<"month" | "year">(),
  // Dönem başı (= yenileme günü). Kullanım kotası takvim ayına değil, bu günün
  // gün-of-month'una sabitli aylık pencereye göre sıfırlanır (bkz.
  // lib/usage/period.ts billingPeriod). Aylık/yıllık fark etmez: anchorDay
  // yenilemeler boyunca sabit kaldığından kota her zaman aylık sıfırlanır.
  subscriptionCurrentPeriodStart: timestamp("subscriptionCurrentPeriodStart", {
    mode: "date",
  }),
  subscriptionCurrentPeriodEnd: timestamp("subscriptionCurrentPeriodEnd", {
    mode: "date",
  }),
  subscriptionCancelAtPeriodEnd: boolean("subscriptionCancelAtPeriodEnd")
    .notNull()
    .default(false),
  // ─── Hesap arşivleme (yumuşak silme) ───
  // "Hesabımı sil" verileri anında silmez; archivedAt'i set eder ve oturumları
  // kapatır. 14 gün içinde tekrar giriş yapılmazsa cron (purge-archived) satırı
  // kalıcı siler (cascade ile tüm bağlı veriler). Re-login archivedAt'i null'lar.
  archivedAt: timestamp("archivedAt", { mode: "date" }),
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

// ─── Cihaz oturumları (Ayarlar → Hesap → Aktif oturumlar) ───
// NextAuth JWT stratejisi kullandığı için yukarıdaki `session` tablosu boştur.
// Çok-cihaz listeleme, uzaktan oturum kapatma ve "tüm cihazlardan çıkış" için
// kendi oturum kayıtlarımızı burada tutarız. Her satırın `id`'si JWT'ye `sid`
// olarak gömülür; jwt callback bunu doğrular (revokedAt dolu → oturum düşer).
export const userSessions = pgTable(
  "user_session",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("userAgent"),
    deviceLabel: text("deviceLabel"),
    ip: text("ip"),
    locationLabel: text("locationLabel"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    lastSeenAt: timestamp("lastSeenAt", { mode: "date" })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revokedAt", { mode: "date" }),
  },
  (t) => [index("user_session_user_idx").on(t.userId)],
)

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
    // marketfiyati'nin kısa opak ürün ID'si (ör. "1O9J"). Eski EAN barkodun yerine.
    productId: text("productId").notNull(),
    name: text("name").notNull(),
    brand: text("brand"),
    category: text("category"),
    imageUrl: text("imageUrl"),
    averagePrice: numeric("averagePrice", { precision: 10, scale: 2 }),
    lastFetchedAt: timestamp("lastFetchedAt", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("product_productid_idx").on(t.productId)],
)

// EAN barkod → marketfiyati productId eşleşme tablosu. Barkod tarayıcıdan gelen
// istekleri productId'ye çevirmek için kalıcı cache; her searchByIdentity barkod
// çözümünde organik olarak büyür.
export const barcodeMap = pgTable("barcode_map", {
  barcode: text("barcode").primaryKey(),
  productId: text("productId").notNull(),
  resolvedAt: timestamp("resolvedAt", { mode: "date" }).notNull().defaultNow(),
})

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
    matchedProductId: text("matchedProductId"),
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
    matchedProductId: text("matchedProductId"),
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
    // Sidebar ikonunu süren kalıcı durum: "awaiting" (onay bekliyor) |
    // "completed" (karşılaştırma/optimizasyon tamamlandı). Bkz.
    // lib/assistant/conversation-status.ts. Varsayılan "awaiting" — yarıda
    // kalan/eski sohbetler bugünkü draft ikonuyla aynı görünür.
    status: text("status")
      .$type<ConversationStatus>()
      .notNull()
      .default("awaiting"),
    // Kullanıcının sabitlediği sohbet. Sidebar'da "Yıldızlı" grubunda üstte
    // gösterilir; updatedAt'i etkilemez (yıldızlamak sohbeti zıplatmaz).
    starred: boolean("starred").notNull().default(false),
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

// ─── Kullanım sayaçları: hesap + ay bazında aylık kotalar ───
//
// Periyot anahtarı "YYYY-MM" olduğu için yeni ay geldiğinde upsert yeni satıra
// (0'dan) yazar — cron'a gerek yoktan lazy reset. Kota kontrolü + artırma tek
// bir atomik INSERT … ON CONFLICT … WHERE ifadesiyle yapılır (bkz.
// lib/usage/usage.ts reserveQuota) → eşzamanlı isteklerde overshoot imkânsız.
// Depolama metrikleri (sepet/fiş) burada tutulmaz; mevcut tablolardan COUNT(*)
// ile okunur.
export const usageCounters = pgTable(
  "usage_counter",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // "YYYY-MM", ör. "2026-06"
    textMessages: integer("textMessages").notNull().default(0),
    imageAnalyses: integer("imageAnalyses").notNull().default(0),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.period] })],
)
