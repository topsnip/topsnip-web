// Shared retry logic for Claude API calls with exponential backoff.

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callClaudeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < maxRetries - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
        continue;
      }
      throw err;
    }
  }
  throw new Error("callClaudeWithRetry: exhausted retries");
}
