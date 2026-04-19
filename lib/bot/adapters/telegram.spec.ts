import { describe, it, expect } from 'vitest';
import { TelegramAdapter } from './telegram';

function mk(token = 'test-token', secret?: string): TelegramAdapter {
  return new TelegramAdapter(token, secret ? { secretToken: secret } : undefined);
}

describe('TelegramAdapter.parseWebhook — plain text', () => {
  it('parses a plain text message', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 100,
          date: 1712345678,
          chat: { id: 99, type: 'private' },
          from: { id: 42, first_name: 'Arjun' },
          text: 'hello bot',
        },
      },
      {},
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('text');
    expect(result!.text).toBe('hello bot');
    expect(result!.chatId).toBe('99');
    expect(result!.userId).toBe('42');
    expect(result!.messageId).toBe('100');
    expect(result!.platform).toBe('telegram');
  });
});

describe('TelegramAdapter.parseWebhook — commands', () => {
  it('parses /start as a command with empty args', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          text: '/start',
        },
      },
      {},
    );
    expect(result!.type).toBe('command');
    expect(result!.command).toBe('/start');
    expect(result!.text).toBe('');
  });

  it('parses /start link_<token> — command stripped, token remains as text', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          text: '/start link_abc123',
        },
      },
      {},
    );
    expect(result!.type).toBe('command');
    expect(result!.command).toBe('/start');
    expect(result!.text).toBe('link_abc123');
  });

  it('strips the @BotName suffix from commands (/start@GSIStudioBot → /start)', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          text: '/start@GSIStudioBot',
        },
      },
      {},
    );
    expect(result!.command).toBe('/start');
  });

  it('parses /link 123456 — code is the stripped text', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          text: '/link 123456',
        },
      },
      {},
    );
    expect(result!.command).toBe('/link');
    expect(result!.text).toBe('123456');
  });
});

describe('TelegramAdapter.parseWebhook — callbacks', () => {
  it('parses an inline-keyboard callback query', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        callback_query: {
          id: 'cbq1',
          from: { id: 42, first_name: 'x' },
          message: {
            message_id: 55,
            date: 1,
            chat: { id: 99, type: 'private' },
          },
          data: 'ceo_choice:abc:A',
        },
      },
      {},
    );
    expect(result!.type).toBe('callback');
    expect(result!.callbackData).toBe('ceo_choice:abc:A');
    expect(result!.chatId).toBe('99');
    expect(result!.messageId).toBe('55');
  });
});

describe('TelegramAdapter.parseWebhook — voice & documents', () => {
  it('parses voice messages with file_id as voiceUrl (not a URL)', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          voice: { file_id: 'VOICE_FILE_123', mime_type: 'audio/ogg' },
        },
      },
      {},
    );
    expect(result!.type).toBe('voice');
    expect(result!.voiceUrl).toBe('VOICE_FILE_123');
  });

  it('parses document messages', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          document: { file_id: 'DOC_1', mime_type: 'application/pdf' },
        },
      },
      {},
    );
    expect(result!.type).toBe('document');
    expect(result!.documentUrl).toBe('DOC_1');
    expect(result!.documentMimeType).toBe('application/pdf');
  });

  it('parses photo messages and picks the largest (last) photo', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          photo: [
            { file_id: 'small', width: 90, height: 67 },
            { file_id: 'medium', width: 320, height: 240 },
            { file_id: 'large', width: 800, height: 600 },
          ],
        },
      },
      {},
    );
    expect(result!.type).toBe('photo');
    expect(result!.documentUrl).toBe('large');
    expect(result!.documentMimeType).toBe('image/jpeg');
  });
});

describe('TelegramAdapter.parseWebhook — forwards', () => {
  it('classifies forwarded messages as type=forward', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          text: 'homework questions',
          forward_from: { id: 999, first_name: 'Teacher' },
        },
      },
      {},
    );
    expect(result!.type).toBe('forward');
    expect(result!.forwardedFrom).toMatch(/teacher/i);
  });

  it('uses forward_from_chat.title when forward_from is absent (channel forwards)', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          text: 'hello',
          forward_from_chat: { id: 500, title: 'Class 5A Homework', type: 'channel' },
        },
      },
      {},
    );
    expect(result!.type).toBe('forward');
    expect(result!.forwardedFrom).toMatch(/class 5a/i);
  });
});

describe('TelegramAdapter.parseWebhook — rejection', () => {
  it('returns null for a completely unknown update shape', () => {
    const adapter = mk();
    const result = adapter.parseWebhook({ update_id: 1, chat_join_request: { id: 1 } }, {});
    expect(result).toBeNull();
  });

  it('returns null for a non-object body', () => {
    const adapter = mk();
    expect(adapter.parseWebhook('not json', {})).toBeNull();
    expect(adapter.parseWebhook(42, {})).toBeNull();
    expect(adapter.parseWebhook(null, {})).toBeNull();
  });

  it('returns null when message exists but has no recognizable content', () => {
    const adapter = mk();
    const result = adapter.parseWebhook(
      {
        update_id: 1,
        message: {
          message_id: 1,
          date: 1,
          chat: { id: 1, type: 'private' },
          from: { id: 1, first_name: 'x' },
          // no text, no voice, no photo, no document
        },
      },
      {},
    );
    expect(result).toBeNull();
  });
});

describe('TelegramAdapter.verifySignature', () => {
  it('returns true when no secret is configured', () => {
    const adapter = mk();
    expect(adapter.verifySignature('{}', {})).toBe(true);
  });

  it('returns true when the secret header matches (case-insensitive header key)', () => {
    const adapter = mk('token', 's3cret');
    expect(
      adapter.verifySignature('{}', { 'x-telegram-bot-api-secret-token': 's3cret' }),
    ).toBe(true);
  });

  it('returns false when the secret header is missing', () => {
    const adapter = mk('token', 's3cret');
    expect(adapter.verifySignature('{}', {})).toBe(false);
  });

  it('returns false when the secret header does not match', () => {
    const adapter = mk('token', 's3cret');
    expect(
      adapter.verifySignature('{}', { 'x-telegram-bot-api-secret-token': 'wrong' }),
    ).toBe(false);
  });
});
