'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Avatar catalog — diverse Indian kids, animals, robots, fantasy
export const AVATARS = [
  // Kids
  { id: 'kid-boy-1', emoji: '👦🏽', label: 'Boy' },
  { id: 'kid-girl-1', emoji: '👧🏽', label: 'Girl' },
  { id: 'kid-boy-2', emoji: '🧑🏽', label: 'Kid' },
  { id: 'kid-girl-2', emoji: '👩🏽', label: 'Girl 2' },
  { id: 'kid-cap', emoji: '🧢', label: 'Cap Kid' },
  // Animals
  { id: 'tiger', emoji: '🐯', label: 'Tiger' },
  { id: 'elephant', emoji: '🐘', label: 'Elephant' },
  { id: 'peacock', emoji: '🦚', label: 'Peacock' },
  { id: 'monkey', emoji: '🐵', label: 'Monkey' },
  { id: 'parrot', emoji: '🦜', label: 'Parrot' },
  { id: 'dolphin', emoji: '🐬', label: 'Dolphin' },
  { id: 'butterfly', emoji: '🦋', label: 'Butterfly' },
  { id: 'panda', emoji: '🐼', label: 'Panda' },
  // Robots & Tech
  { id: 'robot', emoji: '🤖', label: 'Robot' },
  { id: 'alien', emoji: '👽', label: 'Alien' },
  { id: 'astronaut', emoji: '🧑‍🚀', label: 'Astronaut' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  // Fantasy
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'dragon', emoji: '🐉', label: 'Dragon' },
  { id: 'wizard', emoji: '🧙', label: 'Wizard' },
  { id: 'fairy', emoji: '🧚', label: 'Fairy' },
  { id: 'ninja', emoji: '🥷', label: 'Ninja' },
  { id: 'superhero', emoji: '🦸', label: 'Superhero' },
  { id: 'star', emoji: '⭐', label: 'Star' },
] as const;

export type AvatarId = (typeof AVATARS)[number]['id'];

interface AvatarPickerProps {
  selected: string | undefined;
  onSelect: (avatarId: string) => void;
}

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Choose your avatar"
      className="grid grid-cols-4 gap-3"
    >
      {AVATARS.map((avatar) => (
        <motion.button
          key={avatar.id}
          role="radio"
          aria-checked={selected === avatar.id}
          aria-label={avatar.label}
          onClick={() => onSelect(avatar.id)}
          whileTap={{ scale: 0.9 }}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl p-3 transition',
            selected === avatar.id
              ? 'bg-purple-100 ring-2 ring-purple-500 scale-110'
              : 'bg-gray-50 hover:bg-gray-100'
          )}
        >
          <span className="text-3xl">{avatar.emoji}</span>
          <span className="text-[10px] text-gray-500">{avatar.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

/**
 * Get the emoji for an avatar ID.
 */
export function getAvatarEmoji(avatarId: string | undefined): string {
  const avatar = AVATARS.find((a) => a.id === avatarId);
  return avatar?.emoji || '👤';
}
