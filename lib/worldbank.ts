export interface WorldBankDataPoint {
  year: number;
  value: number;
}

export async function fetchWorldBankData(
  countryCode: string,
  indicatorCode: string,
  startYear: number,
  endYear: number
): Promise<WorldBankDataPoint[]> {
  try {
    const url = `https://api.worldbank.org/v2/country/${countryCode}/indicator/${indicatorCode}?date=${startYear}:${endYear}&format=json&per_page=100`;
    const res = await fetch(url);
    const json = await res.json();

    // World Bank wraps data in index 1; index 0 is pagination metadata
    if (!Array.isArray(json) || !Array.isArray(json[1])) {
      return [];
    }

    return json[1]
      .map((entry: { date: string; value: number | null | undefined }) => ({
        year: Number(entry.date),
        value: entry.value,
      }))
      .filter(
        (point: { year: number; value: number | null | undefined }): point is WorldBankDataPoint =>
          point.value !== null && point.value !== undefined
      )
      .sort((a: WorldBankDataPoint, b: WorldBankDataPoint) => a.year - b.year);
  } catch {
    return [];
  }
}
