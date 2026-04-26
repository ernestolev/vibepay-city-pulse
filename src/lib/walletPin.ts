/** PIN de demostración (6 cifras). No usar en producción. */
export const VIBEPAY_DEMO_WALLET_PIN = "123456";

/** Baraja un array (Fisher–Yates). */
export function shuffledNumberKeys(): number[] {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
