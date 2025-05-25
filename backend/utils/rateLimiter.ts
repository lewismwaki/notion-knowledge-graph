// Simple rate limiter to avoid hitting Notion API rate limits
// Notion has a limit of 3 requests per second

let lastRequestTime = 0;
const MIN_REQUEST_SPACING_MS = 350; // ~3 requests per second

export async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_SPACING_MS) {
    const delayTime = MIN_REQUEST_SPACING_MS - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delayTime));
  }
  
  lastRequestTime = Date.now();
}
