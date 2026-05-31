export function generateVeritasId(
  countryCode: string,
  indicatorShort: string,
  hash: string
): string {
  const prefix = hash.slice(0, 6).toUpperCase();
  return `VID-${countryCode}-${indicatorShort}-${prefix}`;
}
