import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export const compareCodePoints = (left: string, right: string): number => {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

/** Deterministic SHA-256 for shared browser and server contract code. */
export const sha256Hex = (input: string): string =>
  bytesToHex(sha256(utf8ToBytes(input)));

export const sortJsonKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareCodePoints(left, right))
        .map(([key, nestedValue]) => [key, sortJsonKeys(nestedValue)]),
    );
  }

  return value;
};
