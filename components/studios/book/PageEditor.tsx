'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Placeholder } from '@tiptap/extension-placeholder';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Underline as UnderlineIcon,
  Wand2,
} from 'lucide-react';
import { CastEditor } from './CastEditor';
import { PageLayoutPicker } from './PageLayoutPicker';
import type {
  Book,
  BookCharacter,
  BookPage,
  GrammarSuggestion,
  PageLayout,
  TipTapDocument,
} from '@/types/book.types';
import { BOOK_FONTS } from '@/lib/templates/bookTemplates';
import { slotAspectRatioForCss } from '@/lib/ai/imageDims';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useGrammarCheck } from '@/hooks/useGrammarCheck';
import { usePageImage } from '@/hooks/usePageImage';
import { useSceneImage } from '@/hooks/useSceneImage';
import { useSession } from '@/hooks/useSession';
import { GrammarSuggestionList } from './GrammarSuggestionPopover';
import { StoryPlanCard } from './StoryPlanCard';

interface PageEditorProps {
  book: Book;
  page: BookPage;
  /** Persist a patch and return whether the save succeeded. Letting the
   *  caller see success/failure means handleMake can show a "save failed"
   *  message instead of silently leaving the old image up. */
  onSave: (patch: {
    richText?: TipTapDocument;
    plainText?: string;
    imageUrl?: string;
    imagePrompt?: string;
    imageStyle?: string;
    layout?: PageLayout;
  }) => Promise<{ ok: boolean; error?: string }>;
  /** Refresh the book document after character mutations from the Cast tab. */
  onBookChange: () => Promise<unknown>;
  saving: boolean;
}

const TEXT_COLORS = [
  '#1F2937',
  '#5B5FFF',
  '#8A5CFF',
  '#FF9F43',
  '#20C997',
  '#EF4444',
  '#3B82F6',
  '#EC4899',
];

const SIZE_PRESETS: Array<{ label: string; px: number }> = [
  { label: 'S', px: 14 },
  { label: 'M', px: 16 },
  { label: 'L', px: 20 },
  { label: 'XL', px: 28 },
];

function plainTextFromDoc(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const content = (doc as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  const out: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (typeof n.text === 'string') out.push(n.text);
    if (Array.isArray(n.content)) for (const c of n.content) visit(c);
  };
  for (const n of content) visit(n);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

type RightTab = 'picture' | 'grammar';

export function PageEditor({ book, page, onSave, onBookChange, saving }: PageEditorProps) {
  const showText = book.format === 'text' || book.format === 'text_image';
  const showImage = book.format === 'image' || book.format === 'text_image';
  const hasCharacters = book.characters.length > 0;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: 'Start writing your page... ✍️',
      }),
    ],
    content: (page.richText ?? { type: 'doc', content: [{ type: 'paragraph' }] }) as never,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[280px] px-4 py-4',
      },
    },
  });

  // Reload content when navigating between pages
  useEffect(() => {
    if (!editor) return;
    const nextContent: TipTapDocument =
      page.richText ?? { type: 'doc', content: [{ type: 'paragraph' }] };
    editor.commands.setContent(nextContent as never, { emitUpdate: false });
  }, [editor, page.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save: debounced PATCH on edit
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        const json = editor.getJSON() as TipTapDocument;
        const plainText = plainTextFromDoc(json);
        void onSave({ richText: json, plainText });
      }, 700);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, onSave, page.id]);

  // Voice input
  const voice = useVoiceInput({ lang: 'en-IN' });
  const lastVoiceTranscriptRef = useRef('');
  useEffect(() => {
    if (!editor || !voice.transcript) return;
    const newText = voice.transcript.slice(lastVoiceTranscriptRef.current.length);
    if (newText) {
      editor.commands.insertContent(newText);
      lastVoiceTranscriptRef.current = voice.transcript;
    }
  }, [editor, voice.transcript]);

  const handleVoiceToggle = () => {
    if (voice.isRecording) {
      voice.stopRecording();
    } else {
      lastVoiceTranscriptRef.current = '';
      voice.reset();
      voice.startRecording();
    }
  };

  // Grammar check
  const grammar = useGrammarCheck();
  const handleGrammarCheck = async () => {
    if (!editor) return;
    const json = editor.getJSON() as TipTapDocument;
    const plainText = plainTextFromDoc(json);
    if (!plainText.trim()) return;
    await grammar.run({
      text: plainText,
      bookId: book.id,
      pageId: page.id,
    });
  };

  const handleAcceptSuggestion = (s: GrammarSuggestion) => {
    if (!editor) return;
    const currentText = plainTextFromDoc(editor.getJSON());
    const updated =
      currentText.slice(0, s.startIndex) + s.suggested + currentText.slice(s.endIndex);
    editor.commands.setContent(
      { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: updated }] }] },
      { emitUpdate: true }
    );
    grammar.dismissSuggestion(s.id);
  };

  const handleKeepSuggestion = (s: GrammarSuggestion) => {
    grammar.dismissSuggestion(s.id);
  };

  // Per-page layout switch — fires onSave with just the layout patch.
  // Server (bookService.updatePage) validates against BUCKET_LAYOUTS.
  const handleLayoutChange = async (nextLayout: PageLayout) => {
    if (nextLayout === page.layout) return;
    await onSave({ layout: nextLayout });
  };

  // Right-panel tab — auto-switch to grammar when there are suggestions
  const [rightTab, setRightTab] = useState<RightTab>(showImage ? 'picture' : 'grammar');
  useEffect(() => {
    if (grammar.hasRun && grammar.suggestions.length > 0) {
      setRightTab('grammar');
    }
  }, [grammar.hasRun, grammar.suggestions.length]);

  if (!editor) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100vh-160px)]">
      {/* Per-page layout picker — visible at the top so kids can switch
       *  layouts (picture-only, words+pic, words-only, etc.) for each page
       *  individually. Bucket-gated via BUCKET_LAYOUTS server-side. */}
      <PageLayoutPicker
        bucket={book.bucket}
        current={page.layout}
        onChange={handleLayoutChange}
      />

      <div
        className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[56px_minmax(0,1fr)_320px] lg:gap-4"
      >
      {/* Vertical toolbar (left rail) */}
      {showText && (
        <div className="flex flex-row flex-wrap gap-1 self-start rounded-2xl border border-gray-200 bg-white p-2 lg:flex-col lg:gap-1.5 lg:p-1.5">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            label="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            label="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            label="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            label="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            label="Bulleted list"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            label="Numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            label="Align left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            label="Align center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            label="Align right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            onClick={handleVoiceToggle}
            active={voice.isRecording}
            label={voice.isRecording ? 'Stop recording' : 'Speak it'}
            disabled={!voice.isSupported}
          >
            {voice.isRecording ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </ToolbarButton>
          <ToolbarButton
            onClick={handleGrammarCheck}
            label="Check grammar"
            disabled={grammar.loading}
          >
            <Wand2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Center canvas */}
      <div className="flex min-w-0 flex-col gap-2">
        {voice.isRecording && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Listening… speak your page
          </div>
        )}

        {showText && (
          <div
            className="flex flex-1 flex-col rounded-3xl border border-gray-200 shadow-card lg:overflow-hidden"
            style={{ backgroundColor: '#FBFAF6' /* paper */ }}
          >
            <div className="flex-1 overflow-y-auto">
              <EditorContent editor={editor} />
            </div>

            {/* Inline font/size/color row — kid-friendly, smaller */}
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-200/80 bg-white/60 px-3 py-2 text-[11px]">
              <select
                onChange={(e) =>
                  e.target.value && editor.chain().focus().setFontFamily(e.target.value).run()
                }
                className="h-7 rounded-md border border-gray-200 bg-white px-1.5"
                aria-label="Font family"
                defaultValue=""
              >
                <option value="">Font</option>
                {BOOK_FONTS.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select
                onChange={(e) => {
                  const px = Number(e.target.value);
                  if (px) {
                    editor
                      .chain()
                      .focus()
                      .setMark('textStyle', { fontSize: `${px}px` })
                      .run();
                  }
                }}
                className="h-7 rounded-md border border-gray-200 bg-white px-1.5"
                aria-label="Font size"
                defaultValue=""
              >
                <option value="">Size</option>
                {SIZE_PRESETS.map((s) => (
                  <option key={s.label} value={s.px}>
                    {s.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-0.5">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => editor.chain().focus().setColor(c).run()}
                    className="h-5 w-5 rounded-full ring-1 ring-gray-200"
                    style={{ backgroundColor: c }}
                    aria-label={`Text colour ${c}`}
                  />
                ))}
              </div>
              <span className="ml-auto text-[10px] uppercase tracking-wide text-gray-400">
                {saving ? 'Saving…' : 'Saved'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — story plan (if any) + tabs (Picture | Grammar) */}
      <aside className="flex min-w-0 flex-col gap-2 overflow-y-auto">
        {book.plot && <StoryPlanCard plot={book.plot} />}

        <div className="flex shrink-0 items-center gap-1 rounded-xl bg-gray-100 p-1">
          {showImage && (
            <TabButton
              label="🖼 Picture"
              active={rightTab === 'picture'}
              onClick={() => setRightTab('picture')}
            />
          )}
          <TabButton
            label="✨ Grammar"
            active={rightTab === 'grammar'}
            onClick={() => setRightTab('grammar')}
            badge={grammar.suggestions.length > 0 ? grammar.suggestions.length : undefined}
          />
        </div>

        <div>
          {rightTab === 'picture' && showImage && (
            <PicturePanel
              book={book}
              page={page}
              hasCharacters={hasCharacters}
              onSave={onSave}
              onBookChange={onBookChange}
            />
          )}
          {rightTab === 'grammar' && (
            <GrammarSuggestionList
              suggestions={grammar.suggestions}
              loading={grammar.loading}
              error={grammar.error}
              hasRun={grammar.hasRun}
              onAccept={handleAcceptSuggestion}
              onKeep={handleKeepSuggestion}
            />
          )}
        </div>
      </aside>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-1 h-px w-full bg-gray-200 lg:h-px lg:w-full" />;
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function TabButton({ label, active, onClick, badge }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-white text-brand-purple shadow-sm' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
      {badge !== undefined && (
        <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, disabled, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-brand-purple text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

interface PicturePanelProps {
  book: Book;
  page: BookPage;
  hasCharacters: boolean;
  onSave: (patch: {
    imageUrl?: string;
    imagePrompt?: string;
    imageStyle?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onBookChange: () => Promise<unknown>;
}

function PicturePanel({
  book,
  page,
  hasCharacters,
  onSave,
  onBookChange,
}: PicturePanelProps) {
  // Match the editor preview to the actual page slot aspect so an empty
  // box is the same shape as the generated image — and the generated
  // image isn't object-cover-cropped during preview.
  const slotAspect = slotAspectRatioForCss(book.size, page.layout);
  return (
    <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-3 shadow-card">
      {/* Current image preview */}
      <div className="relative">
        {page.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.imageUrl}
            alt=""
            className="w-full rounded-2xl object-cover"
            style={{ aspectRatio: slotAspect }}
          />
        ) : (
          <div
            className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 text-gray-400"
            style={{ aspectRatio: slotAspect }}
          >
            <ImagePlus className="h-12 w-12" />
          </div>
        )}
      </div>

      {hasCharacters ? (
        <SceneImageMaker
          book={book}
          page={page}
          onSave={onSave}
          onBookChange={onBookChange}
        />
      ) : (
        <NoCastImageMaker
          book={book}
          page={page}
          onSave={onSave}
          onBookChange={onBookChange}
        />
      )}
    </div>
  );
}

interface MakerProps {
  book: Book;
  page: BookPage;
  onSave: (patch: {
    imageUrl?: string;
    imagePrompt?: string;
    imageStyle?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onBookChange: () => Promise<unknown>;
}

/** Character-aware scene maker — chips for selecting + inline cast editor. */
function SceneImageMaker({ book, page, onSave, onBookChange }: MakerProps) {
  const scene = useSceneImage();
  const { creationsRemaining, cooldownSeconds } = useSession();
  const [selectedIds, setSelectedIds] = useState<string[]>(book.characters.map((c) => c.id));
  const [action, setAction] = useState('');
  const [castOpen, setCastOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleCharacter = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const canMake = action.trim().length >= 3 && !scene.loading;

  const handleMake = async () => {
    if (!canMake) return;
    setSaveError(null);
    const result = await scene.generate({
      bookId: book.id,
      pageId: page.id,
      characterIds: selectedIds,
      action: action.trim(),
    });
    if (!result) return; // scene.error is already set + visible
    const saved = await onSave({
      imageUrl: result.imageUrl,
      imagePrompt: result.prompt,
    });
    if (!saved.ok) {
      setSaveError(saved.error ?? 'Could not save the picture — try again.');
    }
  };

  const canAddMore = book.characters.length < 3;

  return (
    <div className="space-y-2.5">
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-700">Who&apos;s in this picture?</p>
          <button
            type="button"
            onClick={() => setCastOpen((v) => !v)}
            className="text-[11px] font-semibold text-brand-purple hover:underline"
          >
            {castOpen ? 'Done editing' : 'Edit cast ✏'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {book.characters.map((c) => (
            <CharacterChip
              key={c.id}
              character={c}
              selected={selectedIds.includes(c.id)}
              onToggle={() => toggleCharacter(c.id)}
            />
          ))}
          {canAddMore && (
            <button
              type="button"
              onClick={() => setCastOpen(true)}
              className="flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 ring-1 ring-purple-300 hover:bg-purple-100"
              aria-label="Add a friend"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          )}
        </div>
      </div>

      {castOpen && <CastEditor book={book} onChange={onBookChange} />}

      <div>
        <p className="mb-1.5 text-xs font-semibold text-gray-700">What are they doing?</p>
        <textarea
          value={action}
          onChange={(e) => setAction(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="playing in the rain"
          className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
        />
        <p className="mt-0.5 text-[10px] text-gray-400">
          Tip: short and active. The characters keep their look from your story.
        </p>
      </div>

      <button
        type="button"
        onClick={handleMake}
        disabled={!canMake}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2.5 text-sm font-semibold text-white shadow-button transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
      >
        <Sparkles className="h-4 w-4" />
        {scene.loading
          ? 'Drawing this scene…'
          : cooldownSeconds > 0
            ? `Wait ${cooldownSeconds}s…`
            : page.imageUrl
              ? 'Try another scene'
              : '✨ Make this scene'}
      </button>

      <DrawingsBalance remaining={creationsRemaining} cooldownSeconds={cooldownSeconds} />

      {(scene.error || saveError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <div className="font-bold">Couldn&apos;t draw the scene</div>
          <div className="mt-0.5">{scene.error ?? saveError}</div>
        </div>
      )}
    </div>
  );
}

/** Friendly balance + cooldown badge. Tells kids how many AI drawings they
 *  have left today and ticks down the cooldown after a generation. */
function DrawingsBalance({
  remaining,
  cooldownSeconds,
}: {
  remaining: number;
  cooldownSeconds: number;
}) {
  if (cooldownSeconds > 0) {
    return (
      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-800">
        <span className="text-sm">⏳</span>
        Get ready in {cooldownSeconds}s — {remaining} drawing{remaining === 1 ? '' : 's'} left today
      </div>
    );
  }
  if (remaining <= 0) {
    return (
      <div className="rounded-xl bg-rose-50 p-2 text-center text-[11px] font-medium text-rose-800">
        No more drawings today — come back tomorrow! ✨
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800">
      <span>✨</span>
      {remaining} drawing{remaining === 1 ? '' : 's'} left today
    </div>
  );
}

/** Empty-cast state: lets the kid add a first character right here, OR fall
 *  through to the simple free-prompt maker for non-character books. */
function NoCastImageMaker({ book, page, onSave, onBookChange }: MakerProps) {
  const [castOpen, setCastOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-3">
        <p className="text-xs font-semibold text-purple-900">
          ✨ Want recurring friends in your pictures?
        </p>
        <p className="mt-1 text-[11px] text-purple-800">
          Add up to 3 characters once — they show up the same on every page.
        </p>
        <button
          type="button"
          onClick={() => setCastOpen((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-brand-purple px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-purple/90"
        >
          <Plus className="h-3 w-3" />
          {castOpen ? 'Hide cast editor' : 'Add a friend'}
        </button>
      </div>

      {castOpen && <CastEditor book={book} onChange={onBookChange} />}

      <SimpleImageMaker book={book} page={page} onSave={onSave} />
    </div>
  );
}

/** Simple action-based maker (used when book has no characters). */
function SimpleImageMaker({
  book,
  page,
  onSave,
}: Omit<MakerProps, 'onBookChange'>) {
  const image = usePageImage();
  const { creationsRemaining, cooldownSeconds } = useSession();
  const [prompt, setPrompt] = useState(page.imagePrompt ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset prompt + error state when switching to a different page so the
  // kid doesn't accidentally save the previous page's prompt onto this
  // one. (Codex P2: imagePrompt was initialised once and stale across
  // page navigation.)
  useEffect(() => {
    setPrompt(page.imagePrompt ?? '');
    setSaveError(null);
    image.reset();
    // image.reset is stable, prompt source is page-derived.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page.id]);

  const aspect: 'square' | 'portrait' | 'landscape' =
    book.size === 'square'
      ? 'square'
      : book.size === 'landscape'
        ? 'landscape'
        : 'portrait';

  const canMake = prompt.trim().length >= 3 && !image.loading;

  const handleMake = async () => {
    if (!canMake) return;
    setSaveError(null);
    const result = await image.generate({
      prompt: prompt.trim(),
      aspect,
      bookId: book.id,
      pageId: page.id,
    });
    if (!result) return;
    const saved = await onSave({
      imageUrl: result.imageUrl,
      imagePrompt: prompt.trim(),
    });
    if (!saved.ok) {
      setSaveError(saved.error ?? 'Could not save the picture — try again.');
    }
  };

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-gray-700">What should the picture show?</p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="a sunny beach with palm trees"
        className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple"
      />
      <button
        type="button"
        onClick={handleMake}
        disabled={!canMake}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2.5 text-sm font-semibold text-white shadow-button transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
      >
        <Sparkles className="h-4 w-4" />
        {image.loading
          ? 'Drawing…'
          : cooldownSeconds > 0
            ? `Wait ${cooldownSeconds}s…`
            : page.imageUrl
              ? 'Try another'
              : '✨ Make a picture'}
      </button>
      <DrawingsBalance remaining={creationsRemaining} cooldownSeconds={cooldownSeconds} />
      {(image.error || saveError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <div className="font-bold">Couldn&apos;t make the picture</div>
          <div className="mt-0.5">{image.error ?? saveError}</div>
        </div>
      )}
    </div>
  );
}

interface CharacterChipProps {
  character: BookCharacter;
  selected: boolean;
  onToggle: () => void;
}

function CharacterChip({ character, selected, onToggle }: CharacterChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`flex items-center gap-1.5 rounded-full pl-1 pr-3 py-1 text-xs font-medium transition-all ${
        selected
          ? 'bg-brand-purple text-white shadow-sm scale-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 grayscale'
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-2 ${
          selected ? 'ring-white' : 'ring-gray-200'
        }`}
      >
        {character.anchorImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={character.anchorImageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm">🦄</span>
        )}
      </span>
      {character.name || 'Unnamed'}
    </button>
  );
}

