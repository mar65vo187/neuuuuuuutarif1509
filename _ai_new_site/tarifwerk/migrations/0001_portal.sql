-- Compatible with an empty database and the original TarifWerk schema.
DO $$ BEGIN
CREATE TYPE "public"."employee_role" AS ENUM('admin', 'berater');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE TYPE "public"."lead_status" AS ENUM('neu', 'kontaktiert', 'termin_bestaetigt', 'in_beratung', 'abgeschlossen', 'verloren');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
CREATE TYPE "public"."lead_type" AS ENUM('beratung', 'termin', 'tarifcheck', 'bewerbung', 'kontakt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "advisor_images" (
	"advisor_id" integer PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"digest" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "advisors" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"city" text NOT NULL,
	"region" text NOT NULL,
	"regions" text[] DEFAULT '{}' NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"bio" text NOT NULL,
	"quote" text,
	"phone" text,
	"whatsapp" text,
	"email" text,
	"initials" text NOT NULL,
	"image_url" text,
	"is_founder" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advisors_slug_unique" UNIQUE("slug")
);

CREATE TABLE IF NOT EXISTS "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "employee_role" DEFAULT 'berater' NOT NULL,
	"advisor_id" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "lead_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"employee_id" integer,
	"body" text NOT NULL,
	"kind" text DEFAULT 'note' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "lead_type" DEFAULT 'beratung' NOT NULL,
	"status" "lead_status" DEFAULT 'neu' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"topic" text,
	"region" text,
	"situation" text,
	"message" text,
	"preferred_channel" text,
	"preferred_time" text,
	"advisor_id" integer,
	"assigned_employee_id" integer,
	"source" text,
	"meta" jsonb,
	"confirmed_slot" text,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "team_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
ALTER TABLE "advisor_images" ADD CONSTRAINT "advisor_images_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "employees" ADD CONSTRAINT "employees_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "leads" ADD CONSTRAINT "leads_advisor_id_advisors_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."advisors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_employee_id_employees_id_fk" FOREIGN KEY ("assigned_employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE advisors ADD COLUMN IF NOT EXISTS image_url text;

CREATE UNIQUE INDEX IF NOT EXISTS employees_email_lower_unique ON employees (lower(email));

CREATE INDEX IF NOT EXISTS leads_assignee_idx ON leads (assigned_employee_id);

CREATE INDEX IF NOT EXISTS leads_advisor_idx ON leads (advisor_id);

CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);

CREATE INDEX IF NOT EXISTS lead_notes_lead_idx ON lead_notes (lead_id, created_at);

CREATE INDEX IF NOT EXISTS team_messages_created_idx ON team_messages (created_at DESC);
