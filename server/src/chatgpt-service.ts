import { createChatGPT, ChatGPTError } from '@siwc/local';
import type { ChatGPTClient, ChatGPTModel } from '@siwc/local';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { windowsCredentials } from './credential-encryption.js';
import { EXPLANATION_INSTRUCTIONS } from './openai-service.js';
import {
  AIServiceError,
  MAX_ANSWER_LENGTH,
} from '../../src/shared/ai-contract.js';
import type { ChatRequest } from '../../src/shared/ai-contract.js';

export function mapPlanError(error: unknown): AIServiceError {
  if (error instanceof AIServiceError) return error;
  const code = error instanceof ChatGPTError ? error.code : '';
  if (
    [
      'sign_in_required',
      'reauth_required',
      'invalid_grant',
      'invalid_token',
      'unauthorized',
      'token_expired',
      'invalid_api_key',
      'invalid_refresh_token',
      'refresh_token_expired',
      'refresh_token_invalidated',
      'refresh_token_reused',
    ].includes(code)
  )
    return new AIServiceError('sign_in_required');
  if (code === 'sharing_not_enabled')
    return new AIServiceError('plan_not_enabled');
  if (/usage_limit|usage_unavailable|rate_limit/.test(code))
    return new AIServiceError('plan_limit');
  if (/model/.test(code)) return new AIServiceError('unsupported_model');
  if (/cancel/.test(code)) return new AIServiceError('unavailable');
  return new AIServiceError('unavailable');
}
export function createPlanService(
  injected?: ChatGPTClient,
  build = createChatGPT,
) {
  let pending: Promise<unknown> | undefined;
  let openAttempt: ((url: string) => void) | undefined;
  let selectedModel = '';
  let models: ChatGPTModel[] = [];
  let authError = false;
  let retryUrl: string | undefined;
  const client =
    injected ??
    build({
      appName: 'ChatGPT Island',
      appId: 'chatgpt-island',
      redirectPort: 0,
      sendHostId: true,
      storageDir: join(
        process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'),
        'ChatGPT Island',
        'auth',
      ),
      credentialEncryption: windowsCredentials,
      openBrowser: (url) => {
        if (!openAttempt) throw new Error('No active sign-in');
        openAttempt(url);
      },
    });
  return {
    async status() {
      const session = await client.getSession();
      return {
        status: pending ? 'connecting' : session.status,
        sharing: session.sharing,
        needsAuthorization: Boolean(retryUrl),
        model: selectedModel,
        error: authError
          ? 'Sign-in failed or was cancelled. Try again.'
          : undefined,
      };
    },
    async start(newProfile = false) {
      if (pending) throw new AIServiceError('busy');
      authError = false;
      retryUrl = undefined;
      models = [];
      selectedModel = '';
      let resolveUrl!: (url: string) => void;
      let rejectUrl!: (error: Error) => void;
      const url = new Promise<string>((resolve, reject) => {
        resolveUrl = resolve;
        rejectUrl = reject;
      });
      let first = true;
      openAttempt = (value) => {
        if (first) {
          first = false;
          resolveUrl(value);
        } else retryUrl = value;
      };
      pending = (async () => {
        const profiles = await client.listProfiles();
        const active = await client.getSession();
        const unfinished =
          !newProfile && !active.profileId
            ? profiles.find((profile) => profile.pending)
            : undefined;
        await client.signIn(
          newProfile
            ? { newProfile: true }
            : unfinished
              ? { profileId: unfinished.id }
              : undefined,
        );
      })()
        .catch(() => {
          authError = true;
          rejectUrl(new Error('Sign-in could not start'));
        })
        .finally(() => {
          pending = undefined;
          openAttempt = undefined;
          retryUrl = undefined;
        });
      return url;
    },
    resume() {
      if (!pending || !retryUrl) throw new AIServiceError('sign_in_required');
      const url = retryUrl;
      retryUrl = undefined;
      return url;
    },
    async disconnect() {
      client.cancelSignIn();
      await pending;
      await client.disconnect();
      models = [];
      selectedModel = '';
      authError = false;
      retryUrl = undefined;
    },
    async models() {
      if (!(await client.getSession()).sharing)
        throw new AIServiceError('sign_in_required');
      models = await client.listModels();
      if (!models.some((m) => m.slug === selectedModel))
        selectedModel = models[0]?.slug ?? '';
      return { models, selectedModel };
    },
    selectModel(model: string) {
      if (!models.some((m) => m.slug === model))
        throw new AIServiceError('unsupported_model');
      selectedModel = model;
    },
    async generate(request: ChatRequest, signal: AbortSignal) {
      try {
        const session = await client.getSession();
        if (session.status !== 'connected')
          throw new AIServiceError('sign_in_required');
        if (!session.sharing) throw new AIServiceError('plan_not_enabled');
        if (!selectedModel) {
          models = await client.listModels({ signal });
          selectedModel = models[0]?.slug ?? '';
        }
        if (!selectedModel) throw new AIServiceError('unsupported_model');
        const bounded = new AbortController();
        let length = 0;
        const result = await client.streamResponse({
          model: selectedModel,
          instructions: EXPLANATION_INSTRUCTIONS,
          input: [
            {
              role: 'user',
              content: JSON.stringify({ reference_text: request.context.text }),
            },
            ...request.messages.map((m) => ({ ...m })),
          ],
          signal: AbortSignal.any([signal, bounded.signal]),
          onDelta: (delta) => {
            length += delta.length;
            if (length > MAX_ANSWER_LENGTH) bounded.abort();
          },
        });
        if (!result.text.trim() || result.text.length > MAX_ANSWER_LENGTH)
          throw new AIServiceError('empty_response');
        return result.text.trim();
      } catch (error) {
        throw mapPlanError(error);
      }
    },
    close() {
      client.cancelSignIn();
    },
  };
}
export type PlanService = ReturnType<typeof createPlanService>;
