/**
 * @test-file   getApiUrl
 * @description Covers explicit override, per-platform auto-detection, and fail-fast errors for apps/mobile/src/lib/api/config.ts
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

import { getApiUrl } from "../config";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: {} },
}));

/**
 * @test-suite  getApiUrl
 * @target      apps/mobile/src/lib/api/config.ts
 * @strategy    unit, process.env / Platform.OS / expo-constants / globalThis.location mocked per case
 * @cases
 *   - [PASS] explicit EXPO_PUBLIC_API_URL wins over auto-detection
 *   - [PASS] derives host from Constants.expoConfig.hostUri on native, default port
 *   - [PASS] honors EXPO_PUBLIC_API_PORT override on native
 *   - [PASS] derives host from globalThis.location.hostname on web, default port
 *   - [PASS] honors EXPO_PUBLIC_API_PORT override on web
 *   - [PASS] throws when native hostUri is unavailable (production/EAS build)
 *   - [PASS] throws when web location is unavailable
 *   - [PASS] empty-string EXPO_PUBLIC_API_URL is treated as unset
 */
describe("getApiUrl", () => {
  const originalPlatformOS = Platform.OS;
  const originalLocation = (globalThis as { location?: unknown }).location;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_PORT;
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = {};
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_API_PORT;
    Platform.OS = originalPlatformOS;
    (globalThis as { location?: unknown }).location = originalLocation;
  });

  it("explicit EXPO_PUBLIC_API_URL wins over auto-detection", () => {
    process.env.EXPO_PUBLIC_API_URL = "http://explicit.example:9999";
    Platform.OS = "web";
    (globalThis as { location?: unknown }).location = { hostname: "1.2.3.4" };

    expect(getApiUrl()).toBe("http://explicit.example:9999");
  });

  it("derives host from Constants.expoConfig.hostUri on native, default port", () => {
    Platform.OS = "ios";
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = { hostUri: "192.168.3.202:8081" };

    expect(getApiUrl()).toBe("http://192.168.3.202:3000");
  });

  it("honors EXPO_PUBLIC_API_PORT override on native", () => {
    Platform.OS = "ios";
    process.env.EXPO_PUBLIC_API_PORT = "4000";
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = { hostUri: "192.168.3.202:8081" };

    expect(getApiUrl()).toBe("http://192.168.3.202:4000");
  });

  it("derives host from globalThis.location.hostname on web, default port", () => {
    Platform.OS = "web";
    (globalThis as { location?: unknown }).location = { hostname: "192.168.3.202" };

    expect(getApiUrl()).toBe("http://192.168.3.202:3000");
  });

  it("honors EXPO_PUBLIC_API_PORT override on web", () => {
    Platform.OS = "web";
    process.env.EXPO_PUBLIC_API_PORT = "4000";
    (globalThis as { location?: unknown }).location = { hostname: "192.168.3.202" };

    expect(getApiUrl()).toBe("http://192.168.3.202:4000");
  });

  it("throws when native hostUri is unavailable (production/EAS build)", () => {
    Platform.OS = "ios";
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = { hostUri: undefined };

    expect(() => getApiUrl()).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it("throws when web location is unavailable", () => {
    Platform.OS = "web";
    delete (globalThis as { location?: unknown }).location;

    expect(() => getApiUrl()).toThrow(/EXPO_PUBLIC_API_URL/);
  });

  it("empty-string EXPO_PUBLIC_API_URL is treated as unset", () => {
    process.env.EXPO_PUBLIC_API_URL = "";
    Platform.OS = "ios";
    (Constants as { expoConfig?: { hostUri?: string } }).expoConfig = { hostUri: "192.168.3.202:8081" };

    expect(getApiUrl()).toBe("http://192.168.3.202:3000");
  });
});
