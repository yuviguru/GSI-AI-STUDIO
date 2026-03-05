import type { Template } from './types';

export const MUSIC_TEMPLATES: Template[] = [
  // Happy
  {
    id: 'music-sunny-morning',
    emoji: '☀️',
    title: 'Sunny Morning Vibes',
    description: 'A cheerful song to start your day',
    promptText: 'A bright, uplifting morning song about waking up excited for a new day of adventures',
    category: 'Happy',
    type: 'music',
    settings: { mood: 'happy', genre: 'pop' },
  },
  {
    id: 'music-festival-dance',
    emoji: '🎉',
    title: 'Festival Dance',
    description: 'Celebrate Diwali, Holi or any festival',
    promptText: 'A fun, energetic festival song about celebrating with family and friends, lights, colors, and sweets',
    category: 'Happy',
    type: 'music',
    settings: { mood: 'happy', genre: 'folk' },
  },
  // Chill
  {
    id: 'music-rainy-day',
    emoji: '🌧️',
    title: 'Rainy Day Melody',
    description: 'Peaceful music for monsoon vibes',
    promptText: 'A soft, calming melody inspired by the sound of monsoon rain on a tin roof, with gentle piano and nature sounds',
    category: 'Chill',
    type: 'music',
    settings: { mood: 'chill', genre: 'classical' },
  },
  {
    id: 'music-stargazing',
    emoji: '✨',
    title: 'Stargazing',
    description: 'Dreamy music for looking at stars',
    promptText: 'A peaceful, dreamy instrumental about lying on a rooftop and watching the stars on a clear night',
    category: 'Chill',
    type: 'music',
    settings: { mood: 'dreamy', genre: 'electronic' },
  },
  // Dance
  {
    id: 'music-bollywood-beats',
    emoji: '💃',
    title: 'Bollywood Beats',
    description: 'Dance like a Bollywood star',
    promptText: 'An energetic Bollywood-style dance track with catchy beats, perfect for dancing with friends',
    category: 'Bollywood',
    type: 'music',
    settings: { mood: 'energetic', genre: 'pop' },
  },
  {
    id: 'music-garba-night',
    emoji: '🪘',
    title: 'Garba Night',
    description: 'Dandiya and garba dance music',
    promptText: 'A lively garba-style track with dhol drums and clapping rhythms, perfect for Navratri celebrations',
    category: 'Bollywood',
    type: 'music',
    settings: { mood: 'energetic', genre: 'folk' },
  },
  // Classical Fusion
  {
    id: 'music-sitar-electronic',
    emoji: '🎸',
    title: 'Sitar Meets Synth',
    description: 'Classical Indian meets electronic beats',
    promptText: 'A fusion track blending sitar melodies with modern electronic beats, creating a unique East-meets-West sound',
    category: 'Classical Fusion',
    type: 'music',
    settings: { mood: 'epic', genre: 'electronic' },
  },
  {
    id: 'music-flute-morning',
    emoji: '🎶',
    title: 'Morning Raga',
    description: 'A calming raga for meditation',
    promptText: 'A soothing morning raga with bamboo flute and tabla, perfect for a peaceful start to the day',
    category: 'Classical Fusion',
    type: 'music',
    settings: { mood: 'chill', genre: 'classical' },
  },
  // Rap / Hip-Hop
  {
    id: 'music-desi-rapper',
    emoji: '🎤',
    title: 'Desi Rap Star',
    description: 'Write your own rap about being awesome',
    promptText: 'A fun rap song about being a confident kid who works hard at school, helps at home, and dreams big',
    category: 'Rap',
    type: 'music',
    settings: { mood: 'energetic', genre: 'hip-hop' },
  },
  // Lullaby
  {
    id: 'music-lullaby',
    emoji: '🌙',
    title: 'Nani Teri Morni',
    description: 'A sweet modern lullaby',
    promptText: 'A gentle, modern lullaby with soft piano and humming, inspired by classic Indian bedtime songs',
    category: 'Lullaby',
    type: 'music',
    settings: { mood: 'dreamy', genre: 'classical' },
  },
  // Rock
  {
    id: 'music-school-band',
    emoji: '🎸',
    title: 'School Band Hero',
    description: 'Rock out with your school band',
    promptText: 'An upbeat rock song about forming a school band and playing at the annual day concert, complete with guitar solos',
    category: 'Rock',
    type: 'music',
    settings: { mood: 'energetic', genre: 'rock' },
  },
];

export const MUSIC_CATEGORIES = [...new Set(MUSIC_TEMPLATES.map((t) => t.category))];
