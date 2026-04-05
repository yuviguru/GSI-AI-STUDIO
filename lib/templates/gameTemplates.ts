import type { Template } from './types';

export const GAME_TEMPLATES: Template[] = [
  // Fantasy World
  {
    id: 'game-dragon-kingdom',
    emoji: '🏰',
    title: 'The Dragon Kingdom',
    description: 'Defend a magical kingdom from an ancient curse',
    promptText: 'You are the last guardian of a magical kingdom where dragons and humans live together. An ancient curse is turning dragons to stone — find the cure before it\'s too late',
    category: 'Fantasy World',
    type: 'game',
    settings: { setting: 'fantasy_world', difficulty: 'medium' },
  },
  {
    id: 'game-enchanted-sword',
    emoji: '⚔️',
    title: 'The Enchanted Sword',
    description: 'A lost weapon holds the key to saving your village',
    promptText: 'Your village is threatened by shadow creatures. Legend says an enchanted sword hidden in the Cursed Caves can defeat them — but no one who entered has ever returned',
    category: 'Fantasy World',
    type: 'game',
    settings: { setting: 'fantasy_world', difficulty: 'hard' },
  },
  // Space Station
  {
    id: 'game-mars-rescue',
    emoji: '🚀',
    title: 'Mars Rescue Mission',
    description: 'Save stranded astronauts on the red planet',
    promptText: 'You receive a distress signal from a research team stranded on Mars. Their oxygen is running low and a massive dust storm is approaching — launch a daring rescue mission',
    category: 'Space Station',
    type: 'game',
    settings: { setting: 'space_station', difficulty: 'medium' },
  },
  {
    id: 'game-alien-signal',
    emoji: '📡',
    title: 'The Alien Signal',
    description: 'Decode a mysterious message from deep space',
    promptText: 'ISRO\'s deep space antenna picks up a strange repeating signal from beyond our solar system. As a young scientist, you must decode it — is it a warning or an invitation?',
    category: 'Space Station',
    type: 'game',
    settings: { setting: 'space_station', difficulty: 'hard' },
  },
  // Underwater City
  {
    id: 'game-ocean-explorer',
    emoji: '🌊',
    title: 'Ocean Explorer',
    description: 'Discover a hidden civilization beneath the waves',
    promptText: 'While diving near the Andaman Islands, you discover a glowing tunnel that leads to a hidden underwater city. The sea people need your help to stop an oil leak threatening their home',
    category: 'Underwater City',
    type: 'game',
    settings: { setting: 'underwater_city', difficulty: 'medium' },
  },
  // Enchanted Forest
  {
    id: 'game-talking-trees',
    emoji: '🌳',
    title: 'Whispers of the Forest',
    description: 'The ancient trees have a secret to share',
    promptText: 'You wake up in an enchanted forest where trees can talk and animals wear clothes. The forest is sick — its magical spring has dried up. Follow the clues to restore it',
    category: 'Enchanted Forest',
    type: 'game',
    settings: { setting: 'enchanted_forest', difficulty: 'easy' },
  },
  // Indian Palace
  {
    id: 'game-palace-mystery',
    emoji: '👑',
    title: 'Palace of Secrets',
    description: 'Uncover hidden rooms in a Rajasthani fort',
    promptText: 'Exploring an ancient Rajasthani fort, you accidentally trigger a hidden mechanism that reveals secret passages. Each room holds a puzzle from Mughal times — solve them all to find the legendary treasure',
    category: 'Indian Palace',
    type: 'game',
    settings: { setting: 'indian_palace', difficulty: 'medium' },
  },
  {
    id: 'game-freedom-escape',
    emoji: '🇮🇳',
    title: 'Freedom Runner',
    description: 'Help a freedom fighter escape the British',
    promptText: 'It\'s 1942 during the Quit India movement. You must help a young freedom fighter escape British soldiers by navigating through the streets of old Delhi, using secret codes and safe houses',
    category: 'Indian Palace',
    type: 'game',
    settings: { setting: 'indian_palace', difficulty: 'hard' },
  },
  // Time Machine
  {
    id: 'game-dino-time',
    emoji: '🦕',
    title: 'Dinosaur Discovery',
    description: 'Travel back 65 million years',
    promptText: 'Your school science project goes wrong and sends you back to the age of dinosaurs! You need to find enough fuel for a return trip while avoiding T-Rex and making friends with a baby Triceratops',
    category: 'Time Machine',
    type: 'game',
    settings: { setting: 'time_machine', difficulty: 'easy' },
  },
  {
    id: 'game-history-hop',
    emoji: '⏰',
    title: 'History Hopper',
    description: 'Fix timeline glitches across Indian history',
    promptText: 'A time machine malfunction is mixing up Indian history — Akbar is attending an ISRO launch and APJ Abdul Kalam is advising Ashoka. Jump through time periods to fix the timeline before history breaks',
    category: 'Time Machine',
    type: 'game',
    settings: { setting: 'time_machine', difficulty: 'medium' },
  },
  // Mystery Island
  {
    id: 'game-treasure-island',
    emoji: '🗺️',
    title: 'Treasure Island',
    description: 'Follow a pirate map to buried treasure',
    promptText: 'You find an old pirate map in your grandmother\'s attic that leads to a mysterious island off the coast of Kerala. Navigate through jungle traps, decode ancient puzzles, and race against treasure hunters',
    category: 'Mystery Island',
    type: 'game',
    settings: { setting: 'mystery_island', difficulty: 'medium' },
  },
  // Futuristic City
  {
    id: 'game-robot-rebellion',
    emoji: '🤖',
    title: 'Robot Rebellion',
    description: 'Robots have taken over — outsmart them',
    promptText: 'In future Bangalore, helpful robots suddenly turn rogue and lock all humans indoors. As a young coder, you realize the robots have a bug in their code — sneak through the city to reach the central server and fix it',
    category: 'Futuristic City',
    type: 'game',
    settings: { setting: 'futuristic_city', difficulty: 'hard' },
  },
];

export const GAME_CATEGORIES = [...new Set(GAME_TEMPLATES.map((t) => t.category))];
