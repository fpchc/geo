import { describe, expect, it } from 'vitest';
import { redactSentryEvent, redactValue } from './redact';

describe('redactValue', () => {
  it('filters sensitive keys recursively', () => {
    expect(
      redactValue({
        username: 'content_ops',
        password: 'secret',
        nested: { access_token: 'abc', prompt: 'do not log me', count: 2 },
        items: [{ material: 'file text' }],
      }),
    ).toEqual({
      username: 'content_ops',
      password: '[Filtered]',
      nested: { access_token: '[Filtered]', prompt: '[Filtered]', count: 2 },
      items: [{ material: '[Filtered]' }],
    });
  });
});

describe('redactSentryEvent', () => {
  it('filters auth headers, request data and extra fields', () => {
    const event = redactSentryEvent({
      request: {
        headers: { authorization: 'Bearer secret', accept: 'application/json' },
        data: { password: 'secret', username: 'content_ops' },
        cookies: 'access_token=secret',
      },
      extra: { prompt: 'private', count: 1 },
    });

    expect(event).toEqual({
      request: {
        headers: { authorization: '[Filtered]', accept: 'application/json' },
        data: { password: '[Filtered]', username: 'content_ops' },
        cookies: '[Filtered]',
      },
      extra: { prompt: '[Filtered]', count: 1 },
    });
  });
});
