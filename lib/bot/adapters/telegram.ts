/**
 * Telegram Bot API adapter — raw-fetch implementation of MessengerAdapter.
 *
 * One `TelegramAdapter` instance per bot token (@GSIPersonalAssistantBot, @GSIKidCeoAssistantBot).
 * Webhook-mode only — `init()` is a no-op; each webhook handler constructs its
 * own adapter bound to that bot's token.
 *
 * No Grammy, no SDK. Uses `https://api.telegram.org/bot{TOKEN}/{method}` with
 * JSON bodies for all POSTs. The token lives in the URL, so no auth headers.
 */

import type {
  BotButton,
  BotIncomingMessage,
  BotIncomingMessageType,
  BotOutgoingMessage,
  MessengerAdapter,
} from '@/lib/bot/types';

// ─── Telegram API response shapes (minimal) ────────────────────────────────

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  title?: string;
  type?: string;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TelegramVoice {
  file_id: string;
  duration: number;
  mime_type?: string;
}

interface TelegramDocument {
  file_id: string;
  file_name?: string;
  mime_type?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  voice?: TelegramVoice;
  document?: TelegramDocument;
  photo?: TelegramPhotoSize[];
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  reply_to_message?: TelegramMessage;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  data?: string;
  message?: TelegramMessage;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

interface TelegramFile {
  file_id: string;
  file_path?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapButtons(rows: BotButton[][]): Array<Array<{ text: string; callback_data: string }>> {
  return rows.map((row) =>
    row.map((btn) => ({ text: btn.text, callback_data: btn.callbackData })),
  );
}

/**
 * Map our internal `parseMode` to Telegram's `parse_mode`.
 *
 * We use legacy `'Markdown'` rather than `'MarkdownV2'` because:
 *   1. Feature modules write simple `*bold*` / `_italic_` / backtick-code
 *      which legacy Markdown supports directly with zero escaping.
 *   2. MarkdownV2 requires blanket-escaping of `.!-+=#` and more; doing
 *      that escapes the asterisks we INTEND as formatting, so bold renders
 *      as literal `*word*` — which was the original bug.
 *   3. Legacy Markdown is deprecated per Telegram but still fully supported;
 *      any future rich formatting can switch to `parseMode: 'html'`.
 */
function toTelegramParseMode(
  mode: BotOutgoingMessage['parseMode'],
): 'HTML' | 'Markdown' | undefined {
  if (mode === 'html') return 'HTML';
  if (mode === 'markdown') return 'Markdown';
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// ─── Adapter ───────────────────────────────────────────────────────────────

export class TelegramAdapter implements MessengerAdapter {
  public readonly platform = 'telegram' as const;
  private readonly token: string;
  private readonly secretToken: string | null;

  constructor(token: string, opts?: { secretToken?: string }) {
    if (!token) throw new Error('TelegramAdapter: bot token is required');
    this.token = token;
    this.secretToken = opts?.secretToken ?? null;
  }

  /** Webhook mode — no polling/long-running connection to initialize. */
  async init(): Promise<void> {
    /* no-op */
  }

  /**
   * Send a message. Dispatches to `sendPhoto` / `sendAudio` / `sendDocument` /
   * `editMessageText` / `sendMessage` based on which fields are set on `message`.
   * Returns the Telegram `message_id` as a string. Throws if `ok: false`.
   */
  async send(message: BotOutgoingMessage): Promise<string> {
    const parseMode = toTelegramParseMode(message.parseMode);
    const text = message.text;
    const replyMarkup = message.buttons
      ? { inline_keyboard: mapButtons(message.buttons) }
      : undefined;
    const replyToId = message.replyToMessageId
      ? Number(message.replyToMessageId)
      : undefined;

    if (message.editMessageId) {
      const result = await this.request<TelegramMessage>('editMessageText', {
        chat_id: message.chatId,
        message_id: Number(message.editMessageId),
        text,
        parse_mode: parseMode,
        reply_markup: replyMarkup,
      });
      return String(result.message_id);
    }

    if (message.image) {
      const result = await this.request<TelegramMessage>('sendPhoto', {
        chat_id: message.chatId,
        photo: message.image.url,
        caption: message.image.caption,
        reply_markup: replyMarkup,
        reply_to_message_id: replyToId,
      });
      return String(result.message_id);
    }

    if (message.audio) {
      const result = await this.request<TelegramMessage>('sendAudio', {
        chat_id: message.chatId,
        audio: message.audio.url,
        caption: message.audio.caption,
        reply_markup: replyMarkup,
        reply_to_message_id: replyToId,
      });
      return String(result.message_id);
    }

    if (message.document) {
      const result = await this.request<TelegramMessage>('sendDocument', {
        chat_id: message.chatId,
        document: message.document.url,
        caption: message.document.filename,
        reply_markup: replyMarkup,
        reply_to_message_id: replyToId,
      });
      return String(result.message_id);
    }

    const result = await this.request<TelegramMessage>('sendMessage', {
      chat_id: message.chatId,
      text,
      parse_mode: parseMode,
      reply_to_message_id: replyToId,
      reply_markup: replyMarkup,
    });
    return String(result.message_id);
  }

  /**
   * Parse a Telegram webhook body into our canonical `BotIncomingMessage`.
   *
   * NOTE: Telegram does not give webhook payloads a downloadable URL for
   * voice/document/photo — only a `file_id`. Because this method is sync (per
   * the `MessengerAdapter` interface), we stash the raw `file_id` in
   * `voiceUrl`/`documentUrl` and defer the URL resolution to `downloadVoice`.
   */
  parseWebhook(body: unknown, _headers: Record<string, string>): BotIncomingMessage | null {
    if (!isRecord(body)) return null;

    if (isRecord(body.callback_query)) {
      return this.parseCallbackQuery(body.callback_query, body);
    }
    if (isRecord(body.message)) {
      return this.parseMessage(body.message, body);
    }
    return null;
  }

  /** Verify Telegram's optional `X-Telegram-Bot-Api-Secret-Token` header. */
  verifySignature(_body: string, headers: Record<string, string>): boolean {
    if (this.secretToken === null) return true;
    const provided =
      headers['x-telegram-bot-api-secret-token'] ??
      headers['X-Telegram-Bot-Api-Secret-Token'];
    return provided === this.secretToken;
  }

  /** Best-effort typing indicator. Errors are swallowed. */
  async sendTyping(chatId: string): Promise<void> {
    try {
      await this.request('sendChatAction', { chat_id: chatId, action: 'typing' });
    } catch {
      /* typing is best-effort — ignore */
    }
  }

  /**
   * Dismiss the loading spinner on an inline-keyboard button.
   *
   * Telegram requires `answerCallbackQuery` within ~15 seconds of a
   * `callback_query` update; without it the tapped button shows a spinner
   * until the Telegram client times out. Call this at the TOP of the
   * callback handler so the kid sees instant feedback — the actual reply
   * message from the handler fires afterwards and appears separately.
   *
   * Errors are swallowed — acknowledging the callback is a UX nicety,
   * not load-bearing. If the query has already expired on Telegram's
   * side (> 60s) we just log and move on.
   */
  async answerCallbackQuery(queryId: string, text?: string): Promise<void> {
    try {
      await this.request('answerCallbackQuery', {
        callback_query_id: queryId,
        text: text ?? undefined,
      });
    } catch (err) {
      console.warn('[telegram] answerCallbackQuery failed:', (err as Error).message);
    }
  }

  /**
   * Download a voice/audio payload as a Buffer.
   *
   * Accepts either a full `https://…` URL (fetched directly) OR a Telegram
   * `file_id` (resolved via `getFile` → `file_path` → file-download URL).
   */
  async downloadVoice(voiceUrl: string): Promise<Buffer> {
    const url = /^https?:\/\//i.test(voiceUrl)
      ? voiceUrl
      : await this.resolveFileIdToUrl(voiceUrl);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Telegram file download failed: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** Register this bot's webhook URL with Telegram. */
  async registerWebhook(url: string): Promise<void> {
    await this.request('setWebhook', {
      url,
      secret_token: this.secretToken ?? undefined,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /** POST JSON to a Telegram Bot API method. Throws on `ok: false`. */
  private async request<T>(method: string, payload: Record<string, unknown>): Promise<T> {
    const res = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as TelegramApiResponse<T>;
    if (!json.ok || json.result === undefined) {
      const desc = json.description ?? `HTTP ${res.status}`;
      throw new Error(`Telegram ${method} failed: ${desc}`);
    }
    return json.result;
  }

  /** Resolve a Telegram `file_id` to a downloadable HTTPS URL. */
  private async resolveFileIdToUrl(fileId: string): Promise<string> {
    const file = await this.request<TelegramFile>('getFile', { file_id: fileId });
    if (!file.file_path) {
      throw new Error(`Telegram getFile returned no file_path for ${fileId}`);
    }
    return `https://api.telegram.org/file/bot${this.token}/${file.file_path}`;
  }

  private parseCallbackQuery(
    cq: Record<string, unknown>,
    raw: unknown,
  ): BotIncomingMessage | null {
    const from = isRecord(cq.from) ? cq.from : null;
    const msg = isRecord(cq.message) ? (cq.message as Record<string, unknown>) : null;
    const chat = msg && isRecord(msg.chat) ? msg.chat : null;
    if (!from || !msg || !chat) return null;

    return {
      platform: 'telegram',
      chatId: String(chat.id),
      userId: String(from.id),
      messageId: String(msg.message_id),
      type: 'callback',
      callbackData: typeof cq.data === 'string' ? cq.data : undefined,
      timestamp: typeof msg.date === 'number' ? new Date(msg.date * 1000) : new Date(),
      raw,
    };
  }

  private parseMessage(
    msg: Record<string, unknown>,
    raw: unknown,
  ): BotIncomingMessage | null {
    const chat = isRecord(msg.chat) ? msg.chat : null;
    const from = isRecord(msg.from) ? msg.from : null;
    if (!chat || !from) return null;

    const forwardFrom = isRecord(msg.forward_from) ? msg.forward_from : null;
    const forwardFromChat = isRecord(msg.forward_from_chat) ? msg.forward_from_chat : null;
    const isForward = forwardFrom !== null || forwardFromChat !== null;

    // Derive the payload type (attachment wins over text; forward only overrides type).
    let type: BotIncomingMessageType;
    let command: string | undefined;
    let text: string | undefined;
    let voiceFileId: string | undefined;
    let documentFileId: string | undefined;
    let documentMimeType: string | undefined;

    if (isRecord(msg.voice)) {
      type = 'voice';
      voiceFileId = typeof msg.voice.file_id === 'string' ? msg.voice.file_id : undefined;
    } else if (isRecord(msg.document)) {
      type = 'document';
      documentFileId =
        typeof msg.document.file_id === 'string' ? msg.document.file_id : undefined;
      documentMimeType =
        typeof msg.document.mime_type === 'string' ? msg.document.mime_type : undefined;
    } else if (Array.isArray(msg.photo) && msg.photo.length > 0) {
      type = 'photo';
      const largest = msg.photo[msg.photo.length - 1];
      if (isRecord(largest) && typeof largest.file_id === 'string') {
        documentFileId = largest.file_id;
      }
      documentMimeType = 'image/jpeg';
    } else if (typeof msg.text === 'string' && msg.text.startsWith('/')) {
      type = 'command';
      const parts = msg.text.split(/\s+/);
      // Strip bot-handle suffix e.g. "/start@GSIPersonalAssistantBot" → "/start"
      command = (parts[0] ?? '').split('@')[0];
      text = parts.slice(1).join(' ');
    } else if (typeof msg.text === 'string') {
      type = 'text';
      text = msg.text;
    } else {
      return null;
    }

    let forwardedFrom: string | undefined;
    if (isForward) {
      if (forwardFrom && typeof forwardFrom.first_name === 'string') {
        forwardedFrom = forwardFrom.first_name;
      } else if (forwardFromChat && typeof forwardFromChat.title === 'string') {
        forwardedFrom = forwardFromChat.title;
      } else {
        forwardedFrom = 'unknown';
      }
      // Forward supersedes the attachment type, but the payload fields above
      // are preserved so downstream modules can still process voice/doc/photo/text.
      type = 'forward';
    }

    const reply = isRecord(msg.reply_to_message) ? msg.reply_to_message : null;
    const replyToMessageId =
      reply && typeof reply.message_id === 'number' ? String(reply.message_id) : undefined;

    return {
      platform: 'telegram',
      chatId: String(chat.id),
      userId: String(from.id),
      messageId: String(msg.message_id),
      type,
      text,
      command,
      voiceUrl: voiceFileId,
      documentUrl: documentFileId,
      documentMimeType,
      forwardedFrom,
      replyToMessageId,
      timestamp: typeof msg.date === 'number' ? new Date(msg.date * 1000) : new Date(),
      raw,
    };
  }
}
