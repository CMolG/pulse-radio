export function hexToRgb(hex: string): [number, number, number] {
  const num = parseInt(hex.charAt(0) === '#' ? hex.slice(1) : hex, 16);
  return [(num >> 16) & 0xFF, (num >> 8) & 0xFF, num & 0xFF];
}
