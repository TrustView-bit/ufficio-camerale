import { parseAnacCsv, parseIpaCsv, parseRnaXml } from "./aperti";
import { parseTelemacoEsteso, parseTelemacoIndirizzi } from "./telemaco";

export { TracciatoSconosciuto } from "./telemaco";

/** Un adapter legge un file di una fonte e ne ricava righe da validare. */
export type Adapter = (contenuto: Buffer, dataAcquisizione: string) => unknown[];

export const ADAPTERS: Record<string, Adapter> = {
  "telemaco-indirizzi": parseTelemacoIndirizzi,
  "telemaco-esteso": parseTelemacoEsteso,
  "ipa-csv": parseIpaCsv,
  "anac-csv": parseAnacCsv,
  "rna-xml": parseRnaXml,
};

export const FONTI_DISPONIBILI = Object.keys(ADAPTERS);
