-- E-posta/şifre kimlik doğrulama: şifre hash'i + TOTP 2FA alanları ve doğrulama/
-- sıfırlama/pending/kurtarma tabloları. Kullanıcı satırı e-posta doğrulanana dek
-- oluşmadığından (email_verification.payload'da bekleyen passwordHash), Google/
-- e-posta hesap birleştirme güvenlidir.
-- Not: bu repo'da şema db:push ile uygulanır; bu dosya kayıt amaçlıdır.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordHash" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordUpdatedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "totpEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "totpSecretEnc" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "totpLastUsedStep" integer;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"purpose" text NOT NULL,
	"userId" text,
	"codeHash" text NOT NULL,
	"tokenHash" text NOT NULL,
	"payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"codeHash" text NOT NULL,
	"tokenHash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pending_login" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "two_factor_recovery_code" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"codeHash" text NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_verification" ADD CONSTRAINT "email_verification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pending_login" ADD CONSTRAINT "pending_login_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "two_factor_recovery_code" ADD CONSTRAINT "two_factor_recovery_code_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_email_purpose_idx" ON "email_verification" USING btree ("email","purpose");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_token_idx" ON "email_verification" USING btree ("tokenHash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_token_idx" ON "password_reset" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_user_idx" ON "password_reset" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_login_token_idx" ON "pending_login" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "two_factor_recovery_user_idx" ON "two_factor_recovery_code" USING btree ("userId");
