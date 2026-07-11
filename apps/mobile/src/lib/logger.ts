type LogLevel = "debug" | "info" | "warn" | "error";

// Console output isn't reliably invisible in production (adb logcat / Xcode
// Console still surface it on release builds), so silencing must be explicit
// rather than assumed. Checked per call rather than once at module load so
// correctness doesn't depend on bundler dead-code elimination.
function log(level: LogLevel, args: unknown[]): void {
  if (!__DEV__) return;
  console[level](...args);
}

export const logger = {
  debug: (...args: unknown[]): void => log("debug", args),
  info: (...args: unknown[]): void => log("info", args),
  warn: (...args: unknown[]): void => log("warn", args),
  error: (...args: unknown[]): void => log("error", args),
};
