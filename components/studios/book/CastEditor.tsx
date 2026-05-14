'use client';

import { useState } from 'react';
import { Plus, Sparkles, Trash2 } from 'lucide-react';
import type { Book, BookCharacter } from '@gsi/types';
import { useBookCharacters } from '@/hooks/useBookCharacters';
import { useCharacterPortrait } from '@/hooks/useCharacterPortrait';

interface CastEditorProps {
  book: Book;
  onChange: () => Promise<unknown>;
}

const MAX_CHARACTERS = 3;

/**
 * Editor-time character management. Lives in the right panel "Cast" tab so
 * kids can add Jerry and the owner mid-book without restarting from the
 * wizard. Each character card has inline-editable name + look, a "Try again"
 * anchor regen button, and a delete. New-character form appears when the
 * kid taps "+ Add a friend".
 */
export function CastEditor({ book, onChange }: CastEditorProps) {
  const characters = book.characters;
  const { addCharacter, updateCharacter, removeCharacter, busy } = useBookCharacters(
    book.id,
    onChange
  );
  const portrait = useCharacterPortrait();
  const [addingNew, setAddingNew] = useState(false);

  const canAdd = characters.length < MAX_CHARACTERS && !addingNew;

  const handleRegenerate = async (character: BookCharacter, look: string) => {
    if (!look.trim()) return;
    const result = await portrait.generate({ lookDescription: look });
    if (result) {
      await updateCharacter(character.id, {
        anchorImageUrl: result.imageUrl,
        anchorPrompt: result.prompt,
      });
    }
  };

  const handleAddNew = async (name: string, look: string) => {
    if (!name.trim() || look.trim().length < 5) return;
    const created = await addCharacter({
      name: name.trim(),
      lookDescription: look.trim(),
    });
    if (created) {
      // Auto-generate the anchor for the new character so the chip shows a face right away
      const result = await portrait.generate({ lookDescription: look.trim() });
      if (result) {
        await updateCharacter(created.id, {
          anchorImageUrl: result.imageUrl,
          anchorPrompt: result.prompt,
        });
      }
      setAddingNew(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-3xl border border-gray-200 bg-white p-3 shadow-card">
      <div>
        <h3 className="text-sm font-bold text-gray-900">🦄 Your cast</h3>
        <p className="mt-0.5 text-[11px] text-gray-600">
          Up to {MAX_CHARACTERS} friends. Same look on every page.
        </p>
      </div>

      {characters.length === 0 && !addingNew && (
        <div className="rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/50 p-3 text-center text-xs text-gray-600">
          No friends yet. Tap below to add one.
        </div>
      )}

      {characters.map((c) => (
        <EditorCharacterCard
          key={c.id}
          character={c}
          disabled={busy || portrait.loading}
          onUpdate={(patch) => updateCharacter(c.id, patch)}
          onDelete={() => removeCharacter(c.id)}
          onRegenerate={(look) => handleRegenerate(c, look)}
          regenerating={portrait.loading}
        />
      ))}

      {addingNew && (
        <NewCharacterForm
          disabled={busy || portrait.loading}
          onSave={handleAddNew}
          onCancel={() => setAddingNew(false)}
        />
      )}

      {canAdd && (
        <button
          type="button"
          onClick={() => setAddingNew(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-purple-400 bg-purple-50/70 px-3 py-2 text-xs font-bold text-purple-700 transition-colors hover:bg-purple-100"
        >
          <Plus className="h-3.5 w-3.5" />
          Add a friend ({MAX_CHARACTERS - characters.length} left)
        </button>
      )}

      {portrait.error && (
        <div className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
          {portrait.error}
        </div>
      )}
    </div>
  );
}

interface EditorCharacterCardProps {
  character: BookCharacter;
  disabled: boolean;
  regenerating: boolean;
  onUpdate: (patch: { name?: string; lookDescription?: string }) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onRegenerate: (look: string) => Promise<unknown>;
}

function EditorCharacterCard({
  character,
  disabled,
  regenerating,
  onUpdate,
  onDelete,
  onRegenerate,
}: EditorCharacterCardProps) {
  const [name, setName] = useState(character.name);
  const [look, setLook] = useState(character.lookDescription);

  const nameChanged = name.trim() !== character.name && name.trim().length > 0;
  const lookChanged = look.trim() !== character.lookDescription && look.trim().length >= 5;

  const handleNameBlur = () => {
    if (nameChanged) onUpdate({ name: name.trim() });
  };

  const handleLookBlur = () => {
    if (lookChanged) onUpdate({ lookDescription: look.trim() });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5">
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-fuchsia-100">
          {character.anchorImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={character.anchorImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl">🦄</div>
          )}
          {regenerating && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-[10px] font-bold text-purple-600">
              ✨
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            maxLength={40}
            disabled={disabled}
            placeholder="Name"
            className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <textarea
            value={look}
            onChange={(e) => setLook(e.target.value)}
            onBlur={handleLookBlur}
            maxLength={300}
            rows={2}
            disabled={disabled}
            placeholder="What do they look like?"
            className="w-full resize-none rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => onRegenerate(look)}
          disabled={disabled || look.trim().length < 5}
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 text-[11px] font-bold text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Remove ${character.name || 'this friend'}?`)) {
              void onDelete();
            }
          }}
          disabled={disabled}
          className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          aria-label="Remove friend"
          title="Remove"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

interface NewCharacterFormProps {
  disabled: boolean;
  onSave: (name: string, lookDescription: string) => Promise<unknown>;
  onCancel: () => void;
}

function NewCharacterForm({ disabled, onSave, onCancel }: NewCharacterFormProps) {
  const [name, setName] = useState('');
  const [look, setLook] = useState('');

  const canSave = name.trim().length > 0 && look.trim().length >= 5 && !disabled;

  const handleSave = async () => {
    if (!canSave) return;
    await onSave(name, look);
    setName('');
    setLook('');
  };

  return (
    <div className="rounded-xl border-2 border-purple-300 bg-purple-50/40 p-2.5">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-purple-700">
        New friend
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        placeholder="Name (e.g. Jerry)"
        className="mb-1.5 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
      <textarea
        value={look}
        onChange={(e) => setLook(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="What do they look like? small brown dog, fluffy ears…"
        className="w-full resize-none rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
      <div className="mt-1.5 flex gap-1.5">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3" />
          ✨ Imagine!
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md bg-white px-2 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
