CREATE TABLE "batch_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" integer NOT NULL,
	"url" text NOT NULL,
	"norm_url" text NOT NULL,
	"domain" text NOT NULL,
	"method" text DEFAULT 'both' NOT NULL,
	"tag" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error" text,
	"meta_json" jsonb
);
--> statement-breakpoint
CREATE TABLE "batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "url_metadata" (
	"norm_url" text NOT NULL,
	"method" text NOT NULL,
	"meta_json" jsonb NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "url_metadata_norm_url_method_pk" PRIMARY KEY("norm_url","method")
);
--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_items_status_id_idx" ON "batch_items" USING btree ("status","id");--> statement-breakpoint
CREATE INDEX "batch_items_domain_idx" ON "batch_items" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "batch_items_tag_idx" ON "batch_items" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "batch_items_batch_id_idx" ON "batch_items" USING btree ("batch_id");