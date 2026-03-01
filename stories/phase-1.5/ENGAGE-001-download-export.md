# ENGAGE-001: Download & Export Creations

## Description
Kids want to keep their creations outside the app — share PDFs at school, play music offline, print quizzes for friends. Enable PDF download for stories and comics, MP3 download for music, and printable PDF for quizzes. Also add "Print" option for stories.

## Requires KB Updates
- None

## Dependencies
- UI-001 (gallery needs to exist to surface download actions in CreationCard)

## Subtasks

### [LIB] Create PDF generation utility
**Target**: `lib/export/pdfGenerator.ts`
**Action**: Create
**Requirements**:
- `generateStoryPdf(story: StoryContent & { title: string }): Promise<Blob>` — renders story pages with illustrations into a PDF
- `generateQuizPdf(quiz: QuizContent & { title: string }): Promise<Blob>` — renders questions + answer key as printable PDF
- Uses `jspdf` library for PDF generation
- Story PDF: title page, then one page per story page with image + text, final page with "Made with GSI AI Studio" branding
- Quiz PDF: title, numbered questions with options, answer key on last page
- Portrait orientation, A4 size
- Install `jspdf` as dependency

### [FE] Create DownloadButton component
**Target**: `components/shared/DownloadButton.tsx`
**Action**: Create
**Requirements**:
- Button with download icon (lucide-react `Download`)
- Props: `creation: Creation`, `variant: 'icon' | 'full'`
- `icon` variant: just icon button (for cards)
- `full` variant: icon + "Download" label (for viewers)
- On click: determines format by creation type:
  - Story/Comic → generates PDF via `pdfGenerator`
  - Music → direct download of `audioUrl` from `MusicContent`
  - Quiz → generates PDF via `pdfGenerator`
- Shows loading spinner during PDF generation
- Triggers browser download with filename: `{title}-gsi-ai-studio.{pdf|mp3}`

### [FE] Integrate download into Story/Music/Quiz viewers
**Target**: `components/studios/story/StoryViewer.tsx`
**Action**: Update
**Requirements**:
- Add `DownloadButton` to action button row (alongside Share, AI X-Ray)
- Same integration for `MusicPlayer.tsx` (download MP3) and `QuizPlayer.tsx` (download PDF)
- In readOnly mode (shared viewer), also show download button

### [FE] Add print support for stories
**Target**: `lib/export/printUtils.ts`
**Action**: Create
**Requirements**:
- `printStory(story: StoryContent & { title: string }): void` — opens print dialog with formatted story
- Creates a hidden print-optimized `<div>`, applies `@media print` styles, triggers `window.print()`
- Clean layout: one story page per printed page
- Add "Print" option to StoryViewer's action menu (separate from download)

### [FE] Integrate download into CreationCard
**Target**: `components/creation/CreationCard.tsx` (from UI-001)
**Action**: Update
**Requirements**:
- Add download action to the three-dot menu in CreationCard
- Uses `DownloadButton` in `icon` variant

### [DATA] Track download count
**Target**: `lib/firebase/creationService.ts`
**Action**: Update
**Requirements**:
- Add `incrementDownload(id: string)` function matching `incrementView` pattern
- Atomically increments `downloadCount` field (add to Firestore doc schema)
- Fire-and-forget call from DownloadButton on successful download

## Acceptance Criteria
- [ ] Stories download as PDF with illustrations and text
- [ ] Music downloads as MP3 file
- [ ] Quizzes download as printable PDF with answer key
- [ ] Print option opens print dialog for stories
- [ ] Download button visible in all studio viewers
- [ ] Download button available in CreationCard action menu
- [ ] Download count tracked in Firestore
- [ ] Generated files include "GSI AI Studio" branding
