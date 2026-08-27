CREATE TABLE "impresa_fonti" (
	"id" serial PRIMARY KEY NOT NULL,
	"partita_iva" varchar(11) NOT NULL,
	"campo" text NOT NULL,
	"fonte" text NOT NULL,
	"priorita" integer NOT NULL,
	"acquisito_il" timestamp with time zone NOT NULL,
	"aggiornato_il" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "impresa_fonti_campo_unico" UNIQUE("partita_iva","campo")
);
--> statement-breakpoint
CREATE INDEX "impresa_fonti_partita_iva_idx" ON "impresa_fonti" USING btree ("partita_iva");