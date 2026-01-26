/**
 * Validation Tests
 *
 * Tests for request validation (method, JSON format, etc.)
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:3004';

describe('Validation Tests', function () {
  this.timeout(10000);

  it('VAL-001: GET request returns 405', async function () {
    const response = await fetch(`${BASE_URL}/swish/callback`, {
      method: 'GET',
    });

    assert.strictEqual(response.status, 405, 'Expected 405 for GET request');
    const text = await response.text();
    assert.strictEqual(text, 'Only POST is supported');
  });

  it('VAL-002: Invalid JSON returns 400', async function () {
    const response = await fetch(`${BASE_URL}/swish/callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    });

    assert.strictEqual(response.status, 400, 'Expected 400 for invalid JSON');
  });
});
