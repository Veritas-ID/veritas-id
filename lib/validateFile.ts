export type FileValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export function validateFile(file: File): FileValidationResult {
  const ACCEPTED_TYPES = ["image/png", "image/jpeg"];
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, reason: "Only PNG, JPG, and JPEG files are accepted." };
  }

  if (file.size > MAX_SIZE) {
    return { valid: false, reason: "File must be smaller than 10 MB." };
  }

  return { valid: true };
}
