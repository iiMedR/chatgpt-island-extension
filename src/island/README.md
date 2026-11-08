# Island implementation

The floating React UI and its Shadow DOM controller live in `src/content/island`. The Commands API routes a validated local callback through `src/content/island-trigger.ts`; `src/content/initialize.ts` connects it to the UI. No AI integration exists; submissions receive a clearly labeled deterministic local placeholder.
