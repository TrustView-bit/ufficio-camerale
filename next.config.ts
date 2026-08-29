import type { NextConfig } from "next";

/**
 * Intestazioni di sicurezza.
 *
 * Una nota sul `'unsafe-inline'` negli script: Next inserisce script inline
 * per l'idratazione, e la scheda azienda ne aggiunge uno con i dati
 * strutturati JSON-LD. L'alternativa pulita è una CSP con nonce, che però
 * richiede un middleware che generi il nonce a ogni richiesta — e questo
 * renderebbe dinamica ogni pagina, buttando via l'ISR su cui il sito si
 * regge. Si accetta il compromesso e lo si dichiara qui, invece di scrivere
 * una CSP severa che poi qualcuno disattiverebbe al primo errore.
 *
 * Il resto è stretto: nessun frame, nessun plugin, niente form verso l'esterno,
 * e le sole immagini di terze parti ammesse sono le tile di OpenStreetMap.
 */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'" +
    // il dev server ricompila valutando codice: senza, la pagina non si carica
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  // le tile della mappa statica; `data:` serve alle immagini incorporate
  "img-src 'self' data: https://tile.openstreetmap.org",
  "connect-src 'self'" +
    (process.env.NODE_ENV === "development" ? " ws: http://localhost:*" : ""),
  "upgrade-insecure-requests",
].join("; ");

const INTESTAZIONI = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // il sito non usa nessuna di queste: negarle esplicitamente evita che
    // possa farlo qualcosa che vi finisca dentro senza che ce ne accorgiamo
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: INTESTAZIONI }];
  },
};

export default nextConfig;
