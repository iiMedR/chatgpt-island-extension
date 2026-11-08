export interface ServerConfig {
  apiKey?: string;
  model: string;
  port: number;
  extensionOrigin: string;
}
export class ConfigurationError extends Error {}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const extensionOrigin = env.EXTENSION_ORIGIN?.trim() ?? '';
  if (!/^chrome-extension:\/\/[a-p]{32}$/.test(extensionOrigin))
    throw new ConfigurationError(
      'Set EXTENSION_ORIGIN to the exact chrome-extension:// origin from chrome://extensions.',
    );
  const portText = env.PORT ?? '8787';
  const port = Number(portText);
  if (
    !/^\d+$/.test(portText) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  )
    throw new ConfigurationError(
      'PORT must be an integer between 1 and 65535.',
    );
  return {
    apiKey: env.OPENAI_API_KEY?.trim() || undefined,
    model: env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini',
    port,
    extensionOrigin,
  };
}
