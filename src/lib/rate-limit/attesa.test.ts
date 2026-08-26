import { describe, expect, it } from "vitest";

import { descriviAttesa } from "./attesa";

describe("descriviAttesa", () => {
  it("usa i secondi sotto il minuto", () => {
    expect(descriviAttesa(45)).toBe("45 secondi");
    expect(descriviAttesa(1)).toBe("1 secondo");
  });

  it("arrotonda per eccesso ai minuti", () => {
    expect(descriviAttesa(61)).toBe("2 minuti");
    expect(descriviAttesa(60)).toBe("1 minuto");
  });

  it("passa alle ore per attese lunghe", () => {
    expect(descriviAttesa(3600)).toBe("1 ora");
    expect(descriviAttesa(7200)).toBe("2 ore");
  });
});
