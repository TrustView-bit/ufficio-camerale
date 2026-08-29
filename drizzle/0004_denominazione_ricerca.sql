ALTER TABLE "companies" ADD COLUMN "denominazione_ricerca" text;--> statement-breakpoint
CREATE INDEX "companies_denominazione_ricerca_idx" ON "companies" USING btree ("denominazione_ricerca");
