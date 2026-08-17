ALTER TABLE "basket" ADD COLUMN "conversationId" uuid;--> statement-breakpoint
ALTER TABLE "basket" ADD COLUMN "sourceToolCallId" text;--> statement-breakpoint
ALTER TABLE "basket" ADD CONSTRAINT "basket_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "basket_conv_tool_idx" ON "basket" USING btree ("userId","conversationId","sourceToolCallId");