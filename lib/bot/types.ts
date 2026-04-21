/** Kid CEO + GSI Studio bot layer — shared type surface.
 *
 *  This is a thin re-export of the canonical bot types in `types/bot.types.ts`.
 *  Feature modules (ceo, homework, challenges, skills) and adapters
 *  (telegram, whatsapp, discord) import from here so the internal
 *  `lib/bot/*` surface is self-contained and the rest of the app never
 *  has to reach into `@/types/bot.types` directly. */

export type {
  BotPlatform,
  BotHandle,
  BotIncomingMessageType,
  BotIncomingMessage,
  BotOutgoingMessage,
  BotOutgoingParseMode,
  BotButton,
  BotActiveModuleId,
  MessengerAdapter,
  BotFeatureModule,
  BotContext,
  BotSession,
  BotLinkCode,
  HomeworkLanguage,
  HomeworkMode,
  HomeworkQuestionType,
  HomeworkQuestionMeta,
  HomeworkQuestion,
  HomeworkAnswer,
  HomeworkProgress,
  HomeworkSession,
} from '@/types';
