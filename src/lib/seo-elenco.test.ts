import { describe, expect, it } from "vitest";

import { metaElenco } from "./seo-elenco";

describe("metaElenco", () => {
  it("sulla prima pagina il canonical è il percorso nudo", () => {
    expect(metaElenco("Aziende a Piombino", "/aziende/toscana/livorno/piombino", 1)).toEqual({
      title: "Aziende a Piombino",
      alternates: { canonical: "/aziende/toscana/livorno/piombino" },
    });
  });

  it("dalla seconda pagina titolo e canonical portano il numero", () => {
    expect(metaElenco("Aziende a Piombino", "/aziende/toscana/livorno/piombino", 3)).toEqual({
      title: "Aziende a Piombino – pagina 3",
      alternates: { canonical: "/aziende/toscana/livorno/piombino?pagina=3" },
    });
  });

  it("un numero di pagina assurdo vale come prima pagina", () => {
    expect(metaElenco("Elenco", "/elenco", Number.NaN).alternates?.canonical).toBe("/elenco");
    expect(metaElenco("Elenco", "/elenco", 0).title).toBe("Elenco");
  });
});
