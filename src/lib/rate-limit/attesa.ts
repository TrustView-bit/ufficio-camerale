/** "45 secondi", "3 minuti", "2 ore": un'attesa leggibile, non un numero. */
export function descriviAttesa(secondi: number): string {
  if (secondi < 60) return `${secondi} second${secondi === 1 ? "o" : "i"}`;

  const minuti = Math.ceil(secondi / 60);
  if (minuti < 60) return `${minuti} minut${minuti === 1 ? "o" : "i"}`;

  const ore = Math.ceil(minuti / 60);
  return `${ore} or${ore === 1 ? "a" : "e"}`;
}
