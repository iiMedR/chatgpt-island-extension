# Island

React UI mounts in a single extension-owned Shadow DOM. Conversation state stays temporary and is disposed on close/context replacement. Production initialization injects the OpenAI adapter; explicit offline builds inject the mock adapter and disable the background relay. See ARCHITECTURE.md and README.md for the bounded request flow, backend setup, privacy boundaries and verification limits.
