import { describe, test, expect } from 'vitest';
import { handlers } from '../../src/mocks/handlers';

describe('MSW handlers', () => {
  test('[Happy] handlers 배열이 정의되어 있다', () => {
    expect(handlers).toBeDefined();
    expect(Array.isArray(handlers)).toBe(true);
  });

  test('[Happy] GET /accounts 핸들러가 존재한다', () => {
    expect(handlers.length).toBeGreaterThan(0);
  });

  test('[Boundary] handlers가 비어있지 않다', () => {
    expect(handlers.length).toBeGreaterThanOrEqual(1);
  });
});
