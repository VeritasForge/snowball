import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  interface Assertion<R = any> extends TestingLibraryMatchers<R, void> {}
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers {}
}
