import { act } from "@testing-library/react-native";
import { notifyManager } from "@tanstack/react-query";

// React Native Testing Library 13 + react-test-renderer 19 can emit this
// false-positive even when the test environment flag is enabled. Keep real
// console errors visible while filtering only this compatibility diagnostic.
const originalConsoleError = console.error;
jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  if (args[0] === "The current testing environment is not configured to support act(...)") return;
  originalConsoleError(...args);
});

// React Query batches subscriber notifications via setTimeout, which fires after
// act() blocks in hook tests have already resolved and triggers "not wrapped in
// act(...)" warnings. Wrapping every notification in act() keeps state updates
// synchronized with the test's own act boundaries.
notifyManager.setNotifyFunction((fn) => act(fn));
