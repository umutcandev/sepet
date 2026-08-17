CREATE TABLE "basket_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"basketId" uuid NOT NULL,
	"rawName" text NOT NULL,
	"searchQuery" text NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '1' NOT NULL,
	"unit" text DEFAULT 'adet' NOT NULL,
	"matchedBarcode" text,
	"matchedName" text,
	"bestMarket" text,
	"bestPrice" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "basket" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"bestSingleMarket" text,
	"bestSingleTotal" numeric(10, 2),
	"twoMarketSavingsTL" numeric(10, 2),
	"summaryJson" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "basket_item" ADD CONSTRAINT "basket_item_basketId_basket_id_fk" FOREIGN KEY ("basketId") REFERENCES "public"."basket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "basket" ADD CONSTRAINT "basket_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "basket_item_basket_idx" ON "basket_item" USING btree ("basketId");--> statement-breakpoint
CREATE INDEX "basket_user_created_idx" ON "basket" USING btree ("userId","createdAt" DESC NULLS LAST);