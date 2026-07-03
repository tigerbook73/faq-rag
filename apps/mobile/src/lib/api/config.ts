// Fails fast on a missing base URL instead of silently defaulting to localhost —
// a wrong-but-valid-looking default breaks only on physical devices, where it's
// hardest to diagnose.
export function getApiUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error("EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to .env and set your web API URL.");
  }
  return url;
}
