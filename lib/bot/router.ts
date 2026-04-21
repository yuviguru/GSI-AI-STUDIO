/** Bot router — dispatches incoming messages to registered feature modules.
 *
 *  One BotRouter instance per Netlify webhook function. Each webhook
 *  registers its own platform adapter + a subset of modules. The router is
 *  the only place that knows about module/adapter shapes; modules stay
 *  platform-agnostic. */

import type {
  BotFeatureModule,
  BotHandle,
  BotIncomingMessage,
  BotOutgoingMessage,
  BotPlatform,
  MessengerAdapter,
} from './types';
import { buildBotContext } from './context';
import { setActiveModule } from './services/sessionStore';

export class BotRouter {
  private modules: BotFeatureModule[] = [];
  private adapters = new Map<BotPlatform, MessengerAdapter>();

  registerModule(module: BotFeatureModule): void {
    this.modules.push(module);
  }

  registerAdapter(adapter: MessengerAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  /** Dispatch an incoming normalized message. See module-resolution order
   *  in the JSDoc above each helper. */
  async route(message: BotIncomingMessage, botHandle: BotHandle): Promise<void> {
    const adapter = this.adapters.get(message.platform);
    if (!adapter) {
      throw new Error(`[BotRouter] No adapter registered for platform=${message.platform}`);
    }

    const send = (msg: BotOutgoingMessage) =>
      adapter.send({ ...msg, chatId: message.chatId });

    // Dismiss the inline-button spinner immediately for callback updates —
    // Telegram shows a loading indicator on the tapped button until
    // `answerCallbackQuery` fires. The actual handler work (scoring, LLM,
    // Firestore) can take 5-10s, so waiting for the handler to finish
    // leaves the button spinning the whole time. Fire-and-forget so we
    // don't block the dispatch.
    if (message.type === 'callback' && adapter.answerCallbackQuery) {
      const raw = message.raw as { callback_query?: { id?: string | number } } | undefined;
      const queryId = raw?.callback_query?.id;
      if (queryId) {
        void adapter.answerCallbackQuery(String(queryId)).catch(() => {
          /* swallowed inside the adapter too — belt + suspenders */
        });
      }
    }

    const context = await buildBotContext({ message, botHandle });

    // 1. Command routing — exact match.
    if (message.type === 'command' && message.command) {
      const target = this.modules.find((m) => m.commands.includes(message.command!));
      if (target) {
        await setActiveModule(message.chatId, target.id as never);
        await target.handle(message, send, context);
        return;
      }
      await send({
        chatId: message.chatId,
        text: this.buildHelpMessage(),
        parseMode: 'markdown',
      });
      return;
    }

    // 2. Callback routing — prefix match. Does not change activeModule.
    if (message.type === 'callback' && message.callbackData) {
      const target = this.modules.find((m) =>
        m.callbackPrefixes.some((p) => message.callbackData!.startsWith(p)),
      );
      if (target) {
        await target.handle(message, send, context);
        return;
      }
    }

    // 3. Forward routing — ask each module.
    if (message.type === 'forward') {
      const target = this.modules.find((m) => m.canHandleForward?.(message) ?? false);
      if (target) {
        await setActiveModule(message.chatId, target.id as never);
        await target.handle(message, send, context);
        return;
      }
    }

    // 4. Voice routing — ask each module.
    if (message.type === 'voice') {
      const target = this.modules.find((m) => m.canHandleVoice?.(message) ?? false);
      if (target) {
        await target.handle(message, send, context);
        return;
      }
    }

    // 5. Fall-through to the chat's active module.
    const activeModuleId = context.session.activeModule;
    if (activeModuleId) {
      const target = this.modules.find((m) => m.id === activeModuleId);
      if (target) {
        await target.handle(message, send, context);
        return;
      }
    }

    // 6. Help.
    await send({
      chatId: message.chatId,
      text: this.buildHelpMessage(),
      parseMode: 'markdown',
    });
  }

  private buildHelpMessage(): string {
    const lines = ['*GSI AI Studio Bot*', '', "Here's what I can do:"];
    for (const mod of this.modules) {
      for (const cmd of mod.commands) {
        lines.push(`${cmd}`);
      }
    }
    if (this.modules.length === 0) {
      lines.push('_No modules registered._');
    }
    lines.push('', 'Type `/link <code>` if you have a pairing code from the web app.');
    return lines.join('\n');
  }
}
