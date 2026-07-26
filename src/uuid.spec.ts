import { describe, expect, it } from 'bun:test';

import { createUuidV4 } from './uuid';

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createUuidV4', () => {
  it('creates distinct RFC 4122 UUID v4 values without randomUUID', () => {
    const values = Array.from({ length: 100 }, createUuidV4);

    expect(values.every((value) => UUID_V4_PATTERN.test(value))).toBe(true);
    expect(new Set(values).size).toBe(values.length);
  });
});
