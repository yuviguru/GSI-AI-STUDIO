# ENGAGE-005: Like/React System with Emoji Reactions

## Description
Let authenticated kids react to creations with emoji reactions — not just a generic heart, but five expressive emojis ("Amazing!", "Funny!", "Creative!", "Smart!", "Cool!"). Reactions show as animated emoji bursts and drive the trending sort on the Explore feed.

## Requires KB Updates
- None

## Dependencies
- AUTH-001 (authentication required to react)
- ENGAGE-003 (Explore feed displays reaction counts)

## Subtasks

### [TYPE] Define reaction types
**Target**: `types/creation.types.ts`
**Action**: Update
**Requirements**:
- Add `ReactionType = 'amazing' | 'funny' | 'creative' | 'smart' | 'cool'`
- Add `Reaction` interface: `{ id, userId, kidId, emoji: ReactionType, createdAt }`
- Add `reactionCounts?: Record<ReactionType, number>` to `Creation` interface
- Map emojis: amazing = '🤩', funny = '😂', creative = '🎨', smart = '🧠', cool = '😎'

### [API] Create reaction endpoint
**Target**: `app/api/creations/[id]/react/route.ts`
**Action**: Create
**Requirements**:
- `POST` method: accepts `{ emoji: ReactionType }`
- Requires Auth token (anonymous users cannot react)
- Creates reaction document in `creations/{id}/reactions` sub-collection
- Duplicate prevention: one reaction per user per creation (can change emoji, not add multiple)
- On new reaction: increment `reactionCounts.{emoji}` and `likeCount` on creation doc (denormalized)
- On changed reaction: decrement old emoji count, increment new
- `DELETE` method: remove reaction and decrement counts
- Returns `{ success: true, totalReactions: number }`

### [FE] Create ReactionBar component
**Target**: `components/social/ReactionBar.tsx`
**Action**: Create
**Requirements**:
- Row of 5 emoji buttons: 🤩 Amazing, 😂 Funny, 🎨 Creative, 🧠 Smart, 😎 Cool
- Each button shows emoji + count (if > 0)
- User's selected reaction highlighted with a ring/background
- Tap to react (or change reaction)
- Long press to see who reacted (future — just show count for now)
- Animated emoji burst effect on tap: emoji flies up and fades (framer-motion)
- Compact mode for cards (just emojis, no labels)
- Disabled state for unauthenticated users with "Sign in to react" tooltip

### [FE] Integrate reactions into viewers
**Target**: `components/studios/story/StoryViewer.tsx`
**Action**: Update
**Requirements**:
- Add `ReactionBar` below creation content (above Share/AI X-Ray buttons)
- Same integration for `MusicPlayer.tsx`, `QuizPlayer.tsx`, `GamePlayer.tsx`
- In `ViewerClient.tsx` (shared viewer): show ReactionBar
- Fetch user's existing reaction on mount (if authenticated)

### [FE] Show reaction summary on CreationCard
**Target**: `components/creation/CreationCard.tsx` (from UI-001)
**Action**: Update
**Requirements**:
- Show top 2-3 reaction emojis with total count below thumbnail
- Format: "🤩😂 12 reactions"
- If no reactions: show nothing (clean card)

### [HOOK] Create useReaction hook
**Target**: `hooks/useReaction.ts`
**Action**: Create
**Requirements**:
- `useReaction(creationId)` — manages reaction state for a creation
- Returns `{ myReaction, reactionCounts, react, removeReaction, loading }`
- `react(emoji)` — calls POST endpoint, updates local state optimistically
- `removeReaction()` — calls DELETE, updates local state
- Fetches user's existing reaction on mount

## Acceptance Criteria
- [ ] 5 emoji reactions available on all creations
- [ ] Animated emoji burst plays on reaction
- [ ] User can change or remove their reaction
- [ ] One reaction per user per creation enforced
- [ ] Reaction counts display on creation cards
- [ ] Reactions drive `likeCount` for trending sort
- [ ] Unauthenticated users see reactions but cannot react
- [ ] Optimistic UI updates for instant feedback
