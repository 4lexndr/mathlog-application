# Mathlog

A device-local journal for deliberate math practice. Mathlog separates stable problem identity from the details of each attempt, so reviews stay connected even when the perceived difficulty or outcome changes.

## Data model

- A **problem** stores its reference, canonicalized URL, subject, and optional image.
- An **attempt** stores the outcome, time, perceived rating, pressure, mistake pattern, and reflection.
- Existing `problems` and `attempts` local-storage data is migrated into the versioned `mathlog:v2` store. Duplicate legacy problems with the same normalized URL or reference are consolidated.

## Development

```sh
npm run dev
npm run build
npm run lint
```
