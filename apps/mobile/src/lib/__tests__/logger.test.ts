/**
 * @test-file   logger
 * @description Verifies dev-only console passthrough silences all levels when __DEV__ is false, for apps/mobile/src/lib/logger.ts
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { logger } from "../logger";

// react-native declares __DEV__ via `declare const`, which TS doesn't merge
// into globalThis's type — this cast is the narrowest way to reassign it for
// the test, not a general escape hatch.
type GlobalWithDev = typeof globalThis & { __DEV__: boolean };
const globalWithDev = globalThis as GlobalWithDev;

/**
 * @test-suite  logger
 * @target      apps/mobile/src/lib/logger.ts
 * @strategy    unit, console.* spied and globalThis.__DEV__ toggled per case
 * @cases
 *   - [PASS] forwards to console.* when __DEV__ is true
 *   - [PASS] stays silent for every level when __DEV__ is false
 */
describe("logger", () => {
  const originalDev = globalWithDev.__DEV__;

  afterEach(() => {
    globalWithDev.__DEV__ = originalDev;
    jest.restoreAllMocks();
  });

  it("forwards to console.* when __DEV__ is true", () => {
    globalWithDev.__DEV__ = true;
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("test");

    expect(spy).toHaveBeenCalledWith("test");
  });

  it("stays silent for every level when __DEV__ is false", () => {
    globalWithDev.__DEV__ = false;
    const spies = (["debug", "info", "warn", "error"] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation(() => {}),
    );

    logger.debug("a");
    logger.info("b");
    logger.warn("c");
    logger.error("d");

    spies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  });
});
