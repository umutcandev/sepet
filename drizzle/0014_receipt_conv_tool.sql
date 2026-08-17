ALTER TABLE "receipt" ADD COLUMN "conversationId" uuid;--> statement-breakpoint
ALTER TABLE "receipt" ADD COLUMN "sourceToolCallId" text;--> statement-breakpoint
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_conversationId_conversation_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_conv_tool_idx" ON "receipt" USING btree ("userId","conversationId","sourceToolCallId");
