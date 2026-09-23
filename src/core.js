/**
 * Default alphabet for boundary generation.
 * Chosen to be a subset of RFC 2046 token characters that is
 * visually unambiguous and safe in HTTP headers and body text.
 */
const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Default length for generated boundaries.
 * Long enough to make accidental collision with payload content
 * astronomically unlikely while remaining within practical header limits.
 */
const DEFAULT_LENGTH = 32;

/**
 * Maximum attempts to find a boundary not present in the payload.
 * Since we choose a new random boundary each attempt, the probability
 * of exhausting this is negligible; the limit exists only to guarantee
 * termination in pathological cases.
 */
const MAX_ATTEMPTS = 100;

/**
 * Generate a cryptographically secure random boundary string that is
 * guaranteed not to appear as a substring of the given payload.
 *
 * @param {string} payload - The body content that the boundary must not appear in.
 * @param {object} [options]
 * @param {number} [options.length=32] - Length of the generated boundary.
 * @param {string} [options.alphabet] - Characters to use. Must be non-empty and contain no duplicates.
 * @param {() => string} [options.random] - Custom random string generator. Receives (length, alphabet).
 * @returns {string} A boundary string.
 * @throws {TypeError} If payload is not a string.
 * @throws {RangeError} If length is not a positive integer.
 * @throws {Error} If alphabet is empty or contains duplicate characters.
 * @throws {Error} If no boundary can be found after MAX_ATTEMPTS.
 */
export function generateBoundary(payload, options = {}) {
  if (typeof payload !== 'string') {
    throw new TypeError('payload must be a string');
  }

  const length = options.length ?? DEFAULT_LENGTH;
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError('length must be a positive integer');
  }

  const alphabet = options.alphabet ?? DEFAULT_ALPHABET;
  if (typeof alphabet !== 'string' || alphabet.length === 0) {
    throw new Error('alphabet must be a non-empty string');
  }
  if (new Set(alphabet).size !== alphabet.length) {
    throw new Error('alphabet must not contain duplicate characters');
  }

  const random = options.random ?? secureRandomString;
  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = random(length, alphabet);
    // Validate that the random function returns a string of correct length
    // composed entirely of characters from the alphabet.
    if (
      typeof candidate === 'string' &&
      candidate.length === length &&
      [...candidate].every((ch) => alphabet.includes(ch))
    ) {
      if (!payload.includes(candidate)) {
        return candidate;
      }
    }
    // If candidate is invalid, fall through and try again.
    // This keeps the function robust against a faulty custom random source.
  }

  throw new Error(
    `Failed to generate a boundary not present in payload after ${MAX_ATTEMPTS} attempts`
  );
}

/**
 * Generate a boundary that is guaranteed not to appear in the payload.
 * If the standard generation fails for any reason (e.g. extremely short
 * alphabet that causes repeated collisions), this falls back to a deterministic
 * construction that appends characters until uniqueness is achieved.
 *
 * The fallback is not random, so it should only be used as a last resort.
 * It always terminates as long as the alphabet has at least two distinct
 * characters, because it can extend the boundary until it is not a substring
 * of any finite payload.
 *
 * @param {string} payload - The body content that the boundary must not appear in.
 * @param {object} [options] - Same options as generateBoundary.
 * @returns {string} A boundary string.
 * @throws {TypeError} If payload is not a string.
 * @throws {RangeError} If length is not a positive integer.
 * @throws {Error} If alphabet is empty or contains duplicate characters.
 */
export function generateBoundaryWithFallback(payload, options = {}) {
  try {
    return generateBoundary(payload, options);
  } catch (err) {
    // Only fall back for generation failures, not for invalid arguments.
    if (err instanceof TypeError || err instanceof RangeError || err.message.includes('alphabet')) {
      throw err;
    }

    const length = options.length ?? DEFAULT_LENGTH;
    const alphabet = options.alphabet ?? DEFAULT_ALPHABET;

    // Deterministic fallback: start with a base of 'A' repeated length times,
    // then extend until it is not in payload.
    let boundary = alphabet[0].repeat(length);
    let extension = '';
    let index = 0;

    while (payload.includes(boundary + extension)) {
      extension += alphabet[index % alphabet.length];
      index++;
    }

    return boundary + extension;
  }
}

/**
 * Default cryptographically secure random string generator.
 * Uses crypto.getRandomValues for unpredictability, falling back to
 * Math.random only if crypto is unavailable (e.g. very old Node).
 *
 * @param {number} length
 * @param {string} alphabet
 * @returns {string}
 */
function secureRandomString(length, alphabet) {
  const chars = new Array(length);

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      chars[i] = alphabet[randomValues[i] % alphabet.length];
    }
  } else {
    // Fallback for environments without Web Crypto.
    for (let i = 0; i < length; i++) {
      chars[i] = alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  }

  return chars.join('');
}
