# PLATFORM-004: Voice Input for Young Kids

## Description
Younger kids (ages 8-10) struggle to type their ideas. Add a microphone button to all prompt forms that uses the Web Speech API to convert spoken input into text. "Tell the AI your story idea!" This removes the biggest friction point for younger users and makes the app more accessible.

## Requires KB Updates
- None

## Subtasks

### [HOOK] Create useSpeechToText hook
**Target**: `hooks/useSpeechToText.ts`
**Action**: Create
**Requirements**:
- Wraps Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`)
- Returns `{ isListening, transcript, start, stop, isSupported, error }`
- Supports Indian English (`en-IN`) and Hindi (`hi-IN`) language codes
- Auto-stops after 30 seconds or on silence
- Handles browser compatibility: Chrome, Edge, Safari (shows "not supported" on Firefox)
- Continuous mode: keeps listening and appending transcript

### [FE] Create VoiceMicButton component
**Target**: `components/shared/VoiceMicButton.tsx`
**Action**: Create
**Requirements**:
- Circular microphone button (lucide-react `Mic`)
- States: idle (gray), listening (red pulsing ring), processing (spinner)
- Press to start, press again to stop
- Animated sound wave visualization while listening
- On stop: fills the prompt textarea with transcript
- "Not supported" tooltip on unsupported browsers
- Positioned next to the prompt textarea

### [FE] Integrate voice input into all PromptForms
**Target**: `components/studios/story/StoryPromptForm.tsx` (and music/quiz/game/comic)
**Action**: Update
**Requirements**:
- Add VoiceMicButton next to (or inside) the prompt textarea
- On transcript received: append to existing text or replace if empty
- Same integration for all 5 studio prompt forms

## Acceptance Criteria
- [ ] Voice mic button visible on all prompt forms
- [ ] Tapping starts speech recognition with visual feedback
- [ ] Spoken text fills the prompt textarea
- [ ] Works with Indian English accent
- [ ] Gracefully handles unsupported browsers
- [ ] Auto-stops on silence or after 30 seconds
