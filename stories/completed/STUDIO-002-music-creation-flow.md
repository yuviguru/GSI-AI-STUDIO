# STUDIO-002: Music Creation Flow

## Description
Implement the Music Lab experience. User selects mood, genre, and optional theme → AI generates a song/beat with lyrics → audio player with waveform visualization → AI X-Ray explains music generation.

## Requires KB Updates
- None

## Subtasks

### [FE] Create MusicPromptForm component
**Target**: `components/studios/music/MusicPromptForm.tsx`
**Action**: Create
**Requirements**:
- Mood selector grid (happy, chill, energetic, dreamy, epic) with emoji icons
- Genre selector (pop, rock, electronic, classical, hip-hop, folk)
- Optional theme text input ("a song about friendship")
- Optional lyrics prompt input
- Duration slider (15-60 seconds)
- "Create My Song" button with loading state

### [FE] Create MusicPlayer component
**Target**: `components/studios/music/MusicPlayer.tsx`
**Action**: Create
**Requirements**:
- Audio playback with play/pause/seek controls
- Waveform or frequency visualization (canvas-based)
- Lyrics display (synced or static)
- Song metadata (genre, mood, BPM, instruments)
- "Share", "Save", "AI X-Ray" action buttons
- Download option (save audio locally)

### [FE] Create MusicProgress component
**Target**: `components/studios/music/MusicProgress.tsx`
**Action**: Create
**Requirements**:
- Animated musical notes/instruments during generation
- Rotating progress messages
- 10-45 second expected duration

### [LIB] Create Suno/MusicGen client
**Target**: `lib/ai/musicClient.ts`
**Action**: Create
**Requirements**:
- Wrapper for Suno API or MusicGen via Replicate
- Generate song from mood/genre/theme/lyrics
- Return audio URL + metadata
- Handle generation timeout (max 60s)

### [API] Implement music generation pipeline
**Target**: `app/api/ai/music/route.ts`
**Action**: Update (replace stub)
**Requirements**:
- Validate input + safety filter
- Rate limit check
- Generate music via musicClient
- Generate AI X-Ray metadata via Claude
- Upload audio to Firebase Storage
- Save creation to Firestore

### [FE] Wire up Music Lab page
**Target**: `app/(public)/create/music/page.tsx`
**Action**: Update (replace stub)
**Requirements**:
- 3-step flow: INSPIRE → CREATE → SHARE
- Use useAiGeneration('music') hook

## Acceptance Criteria
- [ ] User can generate a song by selecting mood and genre
- [ ] Audio plays with visual waveform
- [ ] Lyrics display alongside audio
- [ ] Generation completes in under 60 seconds
- [ ] Share and Save buttons work
- [ ] AI X-Ray explains how music AI works
