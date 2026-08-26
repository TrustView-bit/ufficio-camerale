CREATE TABLE "api_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"endpoint" text NOT NULL,
	"partita_iva" varchar(11),
	"outcome" text NOT NULL,
	"http_status" integer,
	"duration_ms" integer,
	"cost_eur" numeric(10, 4) DEFAULT '0' NOT NULL,
	"served_from_cache" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"partita_iva" varchar(11) NOT NULL,
	"codice_fiscale" varchar(16),
	"denominazione" text NOT NULL,
	"forma_giuridica" text,
	"stato_attivita" text DEFAULT 'sconosciuto' NOT NULL,
	"data_costituzione" date,
	"rea_numero" text,
	"rea_cciaa" text,
	"capitale_sociale" numeric(15, 2),
	"ateco_primario" text,
	"ateco_primario_descrizione" text,
	"ateco_secondari" jsonb DEFAULT '[]'::jsonb,
	"sede" jsonb,
	"unita_locali" jsonb DEFAULT '[]'::jsonb,
	"bilanci" jsonb DEFAULT '[]'::jsonb,
	"pec" text,
	"sito_web" text,
	"telefono" text,
	"dipendenti" integer,
	"classe_dipendenti" text,
	"descrizione" text,
	"descrizione_generated_at" timestamp with time zone,
	"descrizione_model" text,
	"provider_name" text NOT NULL,
	"provider_raw" jsonb,
	"fetched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_partita_iva_unique" UNIQUE("partita_iva")
);
--> statement-breakpoint
CREATE INDEX "api_calls_created_at_idx" ON "api_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_calls_provider_idx" ON "api_calls" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "companies_denominazione_idx" ON "companies" USING btree ("denominazione");--> statement-breakpoint
CREATE INDEX "companies_fetched_at_idx" ON "companies" USING btree ("fetched_at");