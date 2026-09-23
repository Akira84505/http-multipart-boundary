import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBoundary, generateBoundaryWithFallback } from '../src/core.js';

test('generateBoundary returns a string of default length', () => {
  const boundary = generateBoundary('hello world');
  assert.equal(typeof boundary, 'string');
  assert.equal(boundary.length, 32);
});

test('generateBoundary returns a boundary not present in payload', () => {
  const payload = 'The quick brown fox jumps over the lazy dog';
  const boundary = generateBoundary(payload);
  assert.equal(payload.includes(boundary), false);
});

test('generateBoundary respects custom length', () => {
  const boundary = generateBoundary('test', { length: 10 });
  assert.equal(boundary.length, 10);
});

test('generateBoundary rejects non-string payload', () => {
  assert.throws(() => generateBoundary(123), TypeError);
  assert.throws(() => generateBoundary(null), TypeError);
  assert.throws(() => generateBoundary(undefined), TypeError);
});

test('generateBoundary rejects invalid length', () => {
  assert.throws(() => generateBoundary('test', { length: 0 }), RangeError);
  assert.throws(() => generateBoundary('test', { length: -5 }), RangeError);
  assert.throws(() => generateBoundary('test', { length: 3.14 }), RangeError);
  assert.throws(() => generateBoundary('test', { length: '10' }), RangeError);
});

test('generateBoundary rejects empty alphabet', () => {
  assert.throws(() => generateBoundary('test', { alphabet: '' }), /alphabet/);
});

test('generateBoundary rejects duplicate alphabet characters', () => {
  assert.throws(() => generateBoundary('test', { alphabet: 'aab' }), /alphabet/);
});

test('generateBoundary uses custom random function when provided', () => {
  let called = false;
  const fakeRandom = (length, alphabet) => {
    called = true;
    return 'A'.repeat(length);
  };
  const boundary = generateBoundary('BBBB', { length: 4, random: fakeRandom });
  assert.equal(called, true);
  assert.equal(boundary, 'AAAA');
});

test('generateBoundary throws after MAX_ATTEMPTS failures', () => {
  const fakeRandom = () => 'ALWAYS';
  assert.throws(
    () => generateBoundary('ALWAYS', { length: 6, random: fakeRandom }),
    /Failed to generate/
  );
});

test('generateBoundaryWithFallback succeeds even when standard generation would fail', () => {
  const fakeRandom = () => 'ALWAYS';
  const boundary = generateBoundaryWithFallback('ALWAYS', {
    length: 6,
    random: fakeRandom,
    alphabet: 'AB',
  });
  assert.equal(typeof boundary, 'string');
  assert.equal(boundary.includes('ALWAYS'), false);
});

test('generateBoundaryWithFallback rethrows invalid argument errors', () => {
  assert.throws(() => generateBoundaryWithFallback(123), TypeError);
  assert.throws(() => generateBoundaryWithFallback('test', { length: 0 }), RangeError);
  assert.throws(() => generateBoundaryWithFallback('test', { alphabet: '' }), /alphabet/);
});

test('generateBoundary with payload containing boundary characters still finds unique string', () => {
  const payload = 'A'.repeat(100) + 'B'.repeat(100);
  const boundary = generateBoundary(payload, { length: 10, alphabet: 'AB' });
  assert.equal(payload.includes(boundary), false);
});

test('generateBoundary handles very short payload', () => {
  const boundary = generateBoundary('', { length: 5 });
  assert.equal(boundary.length, 5);
});

test('generateBoundary handles payload equal to candidate', () => {
  const fakeRandom = () => 'EXACT';
  assert.throws(
    () => generateBoundary('EXACT', { length: 5, random: fakeRandom }),
    /Failed to generate/
  );
});

test('default alphabet contains no duplicate characters', () => {
  // Verify our assumption in the default alphabet.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  assert.equal(new Set(alphabet).size, alphabet.length);
});

test('generateBoundary validates custom random output length', () => {
  const badRandom = () => 'SHORT';
  assert.throws(
    () => generateBoundary('test', { length: 10, random: badRandom }),
    /Failed to generate/
  );
});
