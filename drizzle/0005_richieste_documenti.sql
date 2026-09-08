CREATE TABLE "richieste_documenti" (
	"id" serial PRIMARY KEY NOT NULL,
	"partita_iva" varchar(11) NOT NULL,
	"denominazione" text NOT NULL,
	"documento_id" text NOT NULL,
	"documento_nome" text NOT NULL,
	"prezzo_indicativo" numeric(10, 2),
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefono" text,
	"note" text,
	"stato" text DEFAULT 'ricevuta' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "richieste_documenti_created_at_idx" ON "richieste_documenti" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "richieste_documenti_partita_iva_idx" ON "richieste_documenti" USING btree ("partita_iva");