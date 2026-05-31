import { createHash } from "crypto";

export function computeHash(years: number[], values: number[]): string {
  const payload = JSON.stringify({ years, values });
  return createHash("sha256").update(payload).digest("hex");
}
