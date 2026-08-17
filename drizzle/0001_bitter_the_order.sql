CREATE TABLE "receipt_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receiptId" uuid NOT NULL,
	"rawName" text NOT NULL,
	"searchQuery" text,
	"quantity" numeric(10, 3) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'adet' NOT NULL,
	"receiptUnitPrice" numeric(10, 2),
	"receiptTotalPrice" numeric(10, 2),
	"matchedBarcode" text,
	"matchedName" text,
	"bestMarket" text,
	"bestPrice" numeric(10, 2),
	"savingsTL" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"marketName" text,
	"purchaseDate" timestamp,
	"totalAmount" numeric(10, 2),
	"imageUrl" text NOT NULL,
	"imageR2Key" text NOT NULL,
	"ocrModel" text DEFAULT 'gemini-2.5-flash' NOT NULL,
	"bestSingleMarket" text,
	"bestSingleTotal" numeric(10, 2),
	"potentialSavingsTL" numeric(10, 2),
	"summaryJson" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receipt_item" ADD CONSTRAINT "receipt_item_receiptId_receipt_id_fk" FOREIGN KEY ("receiptId") REFERENCES "public"."receipt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_item_receipt_idx" ON "receipt_item" USING btree ("receiptId");--> statement-breakpoint
CREATE INDEX "receipt_user_created_idx" ON "receipt" USING btree ("userId","createdAt" DESC NULLS LAST);