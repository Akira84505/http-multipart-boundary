# HTTP Multipart Boundary

Generate multipart boundary strings that are guaranteed not to appear in a given body payload.

## Usage

```js
import { generateBoundary } from 'http-multipart-boundary';

const payload = 'some body content with --possible--boundary--like--text';
const boundary = generateBoundary(payload);
console.log(boundary); // e.g. "Xk9vL2mQ8wR3tY6uI0pO4aSdFgHjKlZx"
console.log(payload.includes(boundary)); // false
```

The library exports `generateBoundary` and `generateBoundaryWithFallback` from the package root.

## Why this library exists

When constructing a multipart HTTP request, the boundary string separates parts of the body. If the boundary appears in the payload itself, the server may parse the body incorrectly. Most implementations pick a random string and hope for the best. This library guarantees the chosen boundary is not a substring of the provided payload, eliminating that class of parsing errors.

The main trade-off is that checking for substring absence requires the full payload to be in memory. For very large payloads, you may prefer a streaming approach, but that is outside the scope of this library.

## Edge cases

The random generation makes up to 100 attempts before giving up. In practice, this never happens with a reasonable alphabet and payload size. If you need an absolute guarantee, use `generateBoundaryWithFallback`, which falls back to a deterministic construction that always succeeds as long as the alphabet has at least two distinct characters.

The default alphabet is 62 alphanumeric characters. If you provide a custom alphabet, it must contain no duplicates.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

