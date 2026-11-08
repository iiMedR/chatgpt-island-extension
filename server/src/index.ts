import { createApp } from './app.js';
import { loadConfig, ConfigurationError } from './config.js';
try {
  const config = loadConfig();
  const app = createApp(config, {
    diagnostic: (code, status) =>
      console.warn(
        JSON.stringify({ event: 'ai_request_failed', code, status }),
      ),
  });
  await app.listen({ host: '127.0.0.1', port: config.port });
  console.info(`ChatGPT Island backend listening on 127.0.0.1:${config.port}`);
  const close = () => {
    void app.close().catch(() => {
      console.error('Backend shutdown failed.');
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
} catch (error) {
  console.error(
    error instanceof ConfigurationError
      ? error.message
      : 'Backend startup failed. Check configuration and whether the port is already in use.',
  );
  process.exitCode = 1;
}
