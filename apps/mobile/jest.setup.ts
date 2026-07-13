// React 19 uses this flag to enable act() environment checks for the
// react-test-renderer used by @testing-library/react-native.
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Shared across API client tests so getApiUrl() doesn't throw before mocks run.
process.env.EXPO_PUBLIC_API_URL = "http://test.local";
