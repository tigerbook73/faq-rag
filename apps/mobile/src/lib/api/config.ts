import Constants from "expo-constants";
import { Platform } from "react-native";

// Matches the Next.js dev server default (apps/web `pnpm dev` -> :3000).
const DEFAULT_API_PORT = "3000";

// Single call site; a local narrow cast instead of a global `Window`
// declaration keeps this project's deliberate `lib: ["es2020"]` (no DOM)
// guardrail intact everywhere else in the React Native codebase.
function getWebHost(): string | undefined {
  return (globalThis as { location?: { hostname?: string } }).location?.hostname;
}

// Constants.expoConfig.hostUri is "<lan-ip>:<metro-port>", only populated by
// @expo/cli in dev mode (Expo Go / dev client connected to Metro). Only the
// host is used here — the port there is Metro's, not the backend's.
function getMetroHost(): string | undefined {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return undefined;
  const host = hostUri.split("/")[0]?.split(":")[0];
  return host || undefined;
}

// Fails fast on a missing/undetectable base URL instead of silently defaulting
// to localhost — a wrong-but-valid-looking default breaks only on physical
// devices, where it's hardest to diagnose.
//
// Resolution order:
//   1. EXPO_PUBLIC_API_URL, if set explicitly, always wins. Required for
//      production/EAS builds (no dev server to auto-detect from), and also
//      useful locally to force a specific host (tunnel, wrong auto-detected
//      network interface, etc).
//   2. Auto-detected host (web location vs Metro hostUri, depending on
//      platform) + a fixed/overridable port.
//   3. Throw with actionable instructions.
export function getApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit;

  const host = Platform.OS === "web" ? getWebHost() : getMetroHost();
  if (!host) {
    throw new Error(
      "Could not determine the API host automatically. Either set EXPO_PUBLIC_API_URL " +
        "explicitly in apps/mobile/.env (required for production/EAS builds), or make sure " +
        "you're running via `expo start` (web or Metro) so the host can be auto-detected. " +
        "See apps/mobile/.env.example.",
    );
  }

  const port = process.env.EXPO_PUBLIC_API_PORT || DEFAULT_API_PORT;
  return `http://${host}:${port}`;
}
