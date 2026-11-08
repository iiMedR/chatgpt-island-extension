import Fastify from 'fastify';
import type { ServerConfig } from './config.js';
import { createOpenAIService, mapOpenAIError } from './openai-service.js';
import type { ResponsesClient } from './openai-service.js';
import {
  isChatRequest,
  BACKEND_DEADLINE_MS,
} from '../../src/shared/ai-contract.js';
import type { AIErrorCode } from '../../src/shared/ai-contract.js';

export const BODY_LIMIT = 262144;
export const AI_TIMEOUT_MS = BACKEND_DEADLINE_MS;
const statusFor = (code: AIErrorCode) =>
  code === 'timeout'
    ? 504
    : code === 'invalid_request'
      ? 400
      : code === 'missing_api_key'
        ? 503
        : ['rate_limit', 'insufficient_credits'].includes(code)
          ? 429
          : 502;
export function createApp(
  config: ServerConfig,
  options: {
    client?: ResponsesClient;
    diagnostic?: (code: AIErrorCode, status: number) => void;
    timeoutMs?: number;
  } = {},
) {
  const app = Fastify({
    logger: false,
    bodyLimit: BODY_LIMIT,
    requestTimeout: 10000,
    connectionTimeout: 65000,
    requestIdHeader: false,
  });
  const generate = createOpenAIService(config, options.client);
  app.addHook('onRequest', async (request, reply) => {
    if (
      request.headers.origin !== config.extensionOrigin ||
      request.headers.host !== `127.0.0.1:${config.port}`
    )
      return reply.code(403).send({ error: 'unavailable' });
    reply
      .header('Access-Control-Allow-Origin', config.extensionOrigin)
      .header('Vary', 'Origin')
      .header('Cache-Control', 'no-store');
    if (
      request.method === 'POST' &&
      request.headers['content-type']?.split(';')[0].trim().toLowerCase() !==
        'application/json'
    )
      return reply.code(415).send({ error: 'invalid_request' });
  });
  app.options('/api/chat', async (request, reply) => {
    const headers =
      request.headers['access-control-request-headers']
        ?.toLowerCase()
        .split(',')
        .map((value) => value.trim()) ?? [];
    if (
      request.headers['access-control-request-method'] !== 'POST' ||
      headers.some((header) => header !== 'content-type')
    )
      return reply.code(403).send({ error: 'invalid_request' });
    return reply
      .header('Access-Control-Allow-Methods', 'POST')
      .header('Access-Control-Allow-Headers', 'Content-Type')
      .code(204)
      .send();
  });
  app.post('/api/chat', async (request, reply) => {
    if (!isChatRequest(request.body))
      return reply.code(400).send({ error: 'invalid_request' });
    const controller = new AbortController();
    let timedOut = false;
    let cancel!: () => void;
    const cancellation = new Promise<never>((_resolve, reject) => {
      cancel = () => reject(new Error('request_cancelled'));
    });
    const disconnected = () => {
      if (!reply.raw.writableFinished) {
        controller.abort();
        cancel();
      }
    };
    request.raw.on('aborted', disconnected);
    reply.raw.on('close', disconnected);
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        reject(new Error('deadline'));
      }, options.timeoutMs ?? AI_TIMEOUT_MS);
    });
    try {
      const text = await Promise.race([
        generate(request.body, controller.signal),
        deadline,
        cancellation,
      ]);
      if (!controller.signal.aborted) return reply.send({ text });
      return reply;
    } catch (error) {
      if (controller.signal.aborted && !timedOut) {
        reply.hijack();
        return;
      }
      const code = timedOut ? 'timeout' : mapOpenAIError(error).code;
      const status = statusFor(code);
      options.diagnostic?.(code, status);
      return reply.code(status).send({ error: code });
    } finally {
      clearTimeout(timer!);
      request.raw.off('aborted', disconnected);
      reply.raw.off('close', disconnected);
    }
  });
  app.setErrorHandler((error, _request, reply) => {
    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? error.statusCode
        : undefined;
    const status =
      typeof statusCode === 'number' && [400, 413, 415].includes(statusCode)
        ? statusCode
        : 500;
    options.diagnostic?.(
      status === 500 ? 'unavailable' : 'invalid_request',
      status,
    );
    void reply
      .code(status)
      .send({ error: status === 500 ? 'unavailable' : 'invalid_request' });
  });
  return app;
}
