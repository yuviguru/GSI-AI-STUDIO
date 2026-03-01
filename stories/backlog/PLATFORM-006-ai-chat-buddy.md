# PLATFORM-006: AI Chat Buddy — Conversational AI Guide

## Description
"Koko Chat" — a friendly conversational AI chatbot that helps kids learn about AI, suggests what to create, answers questions about their creations, and provides creative inspiration. Uses Claude API with a kid-friendly system prompt. Acts as a creative mentor and learning companion.

## Requires KB Updates
- None

## Dependencies
- AUTH-001 (chat history tied to user account)
- UI-002 (mascot character used as chat avatar)

## Subtasks

### [API] Create chat endpoint
**Target**: `app/api/ai/chat/route.ts`
**Action**: Create
**Requirements**:
- Streaming chat endpoint using Claude API
- Kid-friendly system prompt: "You are Koko, a friendly AI buddy for kids aged 8-17..."
- Safety guardrails: refuse inappropriate topics, stay educational/creative
- Context-aware: knows about the user's recent creations and AI concepts learned
- Rate limited: 20 messages per session per day

### [FE] Create ChatBubble component
**Target**: `components/chat/ChatBubble.tsx`
**Action**: Create
**Requirements**:
- Chat interface with mascot avatar on AI messages
- User messages aligned right, AI messages aligned left
- Streaming text display (character by character)
- Suggestion chips for quick responses
- Input area with send button and mic (reuse VoiceMicButton)

### [FE] Create ChatSheet component
**Target**: `components/chat/ChatSheet.tsx`
**Action**: Create
**Requirements**:
- Bottom sheet or slide-over panel
- Accessible via floating action button on all pages
- Chat history persists within session
- "Ask Koko" starter prompts: "What should I create?", "How does AI make music?", "Help me with my story idea"

## Acceptance Criteria
- [ ] Kids can chat with Koko (mascot) about AI and creativity
- [ ] Responses are kid-friendly and age-appropriate
- [ ] Chat accessible from any page via floating button
- [ ] Streaming responses for natural feel
- [ ] Safety guardrails prevent inappropriate conversations
- [ ] Suggestion chips help kids start conversations
