/**
 * SimHash — a locality-sensitive hashing algorithm for near-duplicate detection.
 *
 * How it works:
 * 1. Tokenize input text into words
 * 2. Hash each word using FNV-1a to get a 64-bit fingerprint
 * 3. For each word hash, iterate over 64 bit positions:
 *    - If the bit is 1, add +1 to that position's accumulator
 *    - If the bit is 0, add -1 to that position's accumulator
 * 4. Final hash: for each of the 64 positions, set bit to 1 if accumulator > 0, else 0
 *
 * Two documents with Hamming distance <= 3 are considered near-duplicates.
 * This catches paraphrased content that fuzzy title matching would miss.
 */

/* eslint-disable no-bitwise */

// FNV-1a constants for 64-bit hashing (using BigInt() to stay compatible with ES2017 target)
const ZERO = BigInt(0);
const ONE = BigInt(1);
const FNV_OFFSET_BASIS = BigInt("0xcbf29ce484222325");
const FNV_PRIME = BigInt("0x100000001b3");
const MASK_64 = (ONE << BigInt(64)) - ONE;

/**
 * Compute a 64-bit FNV-1a hash for a single token.
 */
function fnv1a64(token: string): bigint {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < token.length; i++) {
    hash ^= BigInt(token.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash;
}

/**
 * Tokenize text into lowercase alphanumeric words (length >= 2).
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

/**
 * Compute a 64-bit SimHash fingerprint for the given text.
 *
 * The fingerprint captures the weighted bit-vector sum across all word hashes.
 * Similar documents produce fingerprints that differ in very few bit positions.
 *
 * @param text - The input text to fingerprint
 * @returns A 64-bit SimHash as a BigInt
 */
export function computeSimHash(text: string): bigint {
  const tokens = tokenize(text);
  if (tokens.length === 0) return ZERO;

  // Accumulator for each of the 64 bit positions
  const bits = new Array<number>(64).fill(0);

  for (const token of tokens) {
    const hash = fnv1a64(token);
    for (let i = 0; i < 64; i++) {
      if ((hash >> BigInt(i)) & ONE) {
        bits[i] += 1;
      } else {
        bits[i] -= 1;
      }
    }
  }

  // Build the final hash from the sign of each accumulator
  let fingerprint = ZERO;
  for (let i = 0; i < 64; i++) {
    if (bits[i] > 0) {
      fingerprint |= ONE << BigInt(i);
    }
  }

  return fingerprint;
}

/**
 * Count the number of differing bits (Hamming distance) between two 64-bit hashes.
 *
 * @param a - First SimHash fingerprint
 * @param b - Second SimHash fingerprint
 * @returns Number of bit positions that differ (0-64)
 */
export function hammingDistance(a: bigint, b: bigint): number {
  let xor = a ^ b;
  let count = 0;
  while (xor > ZERO) {
    count += Number(xor & ONE);
    xor >>= ONE;
  }
  return count;
}

/**
 * Check whether two SimHash fingerprints indicate near-duplicate content.
 *
 * @param a - First SimHash fingerprint
 * @param b - Second SimHash fingerprint
 * @param threshold - Maximum Hamming distance to consider duplicate (default: 3)
 * @returns True if the documents are near-duplicates
 */
export function isDuplicate(a: bigint, b: bigint, threshold = 3): boolean {
  return hammingDistance(a, b) <= threshold;
}
