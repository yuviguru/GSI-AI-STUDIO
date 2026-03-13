import type {
  SkillArenaChallenge,
  SkillArenaChallengeType,
  SkillArenaDifficulty,
  SkillArenaModule,
  SkillArenaQuestion,
} from '@/types/mindx.types';

// ─── Speaking Challenges ──────────────────────────────────

const SPEAKING_CHALLENGES: Omit<SkillArenaChallenge, 'id'>[] = [
  // ── read_aloud (12) ──
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read the following passage clearly and with expression', passage: 'The mango tree in our school garden is the oldest tree in the neighbourhood. Every summer, it gives us the sweetest mangoes. The children gather under its shade during recess, sharing stories and laughter.', timeLimit: 60, isIndiaThemed: true } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read this passage aloud with clear pronunciation', passage: 'The Indian Space Research Organisation launched its first rocket in 1963. Since then, ISRO has sent missions to the Moon and Mars, making India proud on the world stage.', timeLimit: 60, isIndiaThemed: true } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read the following passage with feeling', passage: 'The rain came suddenly, turning the dusty streets into little rivers. Children ran out of their houses, splashing in puddles and catching raindrops on their tongues. The monsoon had finally arrived.', timeLimit: 60, isIndiaThemed: true } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read this passage clearly at a steady pace', passage: 'Robots are machines that can be programmed to do tasks. Some robots help doctors perform surgeries. Others explore the deep ocean or outer space where humans cannot easily go.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read the passage with expression and proper pauses', passage: 'The Taj Mahal stands as one of the most beautiful buildings in the world. Built by Emperor Shah Jahan, it took over twenty years and thousands of workers to complete this marble wonder.', timeLimit: 60, isIndiaThemed: true } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read this clearly and confidently', passage: 'The butterfly begins its life as a tiny egg. It hatches into a caterpillar, then wraps itself in a cocoon. Weeks later, it emerges as a beautiful butterfly with colourful wings.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read aloud with proper emphasis', passage: 'The Himalayas are the highest mountain range in the world, stretching across five countries. Mount Everest, the tallest peak, rises to 8,849 metres. Every year, hundreds of climbers attempt to reach its summit.', timeLimit: 60, isIndiaThemed: true } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read this passage with clear articulation', passage: 'Coral reefs are sometimes called the rainforests of the ocean. They cover less than one percent of the ocean floor but support nearly 25 percent of all marine species. Rising sea temperatures threaten these colourful underwater ecosystems.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read the following paragraph at a natural pace', passage: 'Every morning, the dabbawala picks up thousands of lunchboxes from homes in Mumbai. By midday, each box reaches the correct office worker across the city. This delivery system has been running since 1890 with almost no errors.', timeLimit: 60, isIndiaThemed: true } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read this passage clearly and with expression', passage: 'Marie Curie was the first woman to win a Nobel Prize. She discovered two new elements, polonium and radium, and her work helped develop X-ray machines used in hospitals today. Her courage and curiosity changed science forever.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read the passage with feeling and proper pauses', passage: 'On the banks of the Ganges in Varanasi, thousands of tiny clay lamps float on the water every evening. The flickering lights create a golden glow against the dark sky. This ancient ritual of Ganga Aarti draws visitors from around the world.', timeLimit: 60, isIndiaThemed: true } },
  { type: 'read_aloud', module: 'speaking', question: { text: 'Read this passage at a steady, clear pace', passage: 'Artificial intelligence is changing the way we live, work, and learn. From voice assistants to self-driving cars, AI is becoming part of everyday life. Understanding how AI works will be one of the most important skills for the future.', timeLimit: 60, isIndiaThemed: false } },

  // ── describe (10) ──
  { type: 'describe', module: 'speaking', question: { text: 'Describe what you think a typical morning looks like at a busy Indian railway station. Include sounds, sights, and feelings.', timeLimit: 90, isIndiaThemed: true } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe your favourite festival and explain why it is special to you.', timeLimit: 90, isIndiaThemed: true } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe what you think life would be like on Mars. What would you see, eat, and do?', timeLimit: 90, isIndiaThemed: false } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe your school playground during lunch break. What activities are happening?', timeLimit: 90, isIndiaThemed: false } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe a street food market in India. What can you see, smell, and hear?', timeLimit: 90, isIndiaThemed: true } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe what happens during a cricket match in your neighbourhood. Talk about the players, the crowd, and the atmosphere.', timeLimit: 90, isIndiaThemed: true } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe your dream school. What subjects would be taught? What would the classrooms and campus look like?', timeLimit: 90, isIndiaThemed: false } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe what you see when you look out of your window on a rainy day. Use vivid words to paint a picture.', timeLimit: 90, isIndiaThemed: false } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe a visit to a local vegetable market (sabzi mandi) early in the morning. Include colours, sounds, and people.', timeLimit: 90, isIndiaThemed: true } },
  { type: 'describe', module: 'speaking', question: { text: 'Describe what it would be like to live underwater in an ocean city. What would your house, school, and transport look like?', timeLimit: 90, isIndiaThemed: false } },

  // ── respond (10) ──
  { type: 'respond', module: 'speaking', question: { text: 'If you could have any superpower for one day, what would it be and what would you do with it? Explain your answer.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'respond', module: 'speaking', question: { text: 'Do you think animals should be kept in zoos? Share your opinion and reasons.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'respond', module: 'speaking', question: { text: 'What is the most interesting thing you have learned recently? Why did it interest you?', timeLimit: 60, isIndiaThemed: false } },
  { type: 'respond', module: 'speaking', question: { text: 'If you could invite any famous Indian person (living or from history) for dinner, who would it be and what would you ask them?', timeLimit: 60, isIndiaThemed: true } },
  { type: 'respond', module: 'speaking', question: { text: 'Do you think AI will replace teachers one day? Share your thoughts.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'respond', module: 'speaking', question: { text: 'Should students be allowed to use mobile phones in school? Give reasons for your answer.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'respond', module: 'speaking', question: { text: 'Is it better to read books on paper or on a screen? Explain your preference.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'respond', module: 'speaking', question: { text: 'If you could travel back in time to any period in Indian history, when would you go and why?', timeLimit: 60, isIndiaThemed: true } },
  { type: 'respond', module: 'speaking', question: { text: 'Some people say homework is unnecessary. Do you agree or disagree? Give your reasons.', timeLimit: 60, isIndiaThemed: false } },
  { type: 'respond', module: 'speaking', question: { text: 'What is one invention that you think has changed the world the most? Explain your choice.', timeLimit: 60, isIndiaThemed: false } },
];

// ─── Listening Challenges ─────────────────────────────────

const LISTENING_CHALLENGES: Omit<SkillArenaChallenge, 'id'>[] = [
  // comprehension (MCQ after hearing passage)
  { type: 'comprehension', module: 'listening', question: { text: 'Who leads an elephant herd?', audioText: 'Elephants are the largest land animals on Earth. An adult elephant can weigh up to 6000 kilograms. They live in groups called herds, led by the oldest female. Elephants use their trunks for breathing, drinking water, and picking up food. They have excellent memories and can remember places and other elephants for many years.', options: ['The oldest male', 'The youngest elephant', 'The oldest female', 'The strongest elephant'], correctOption: 'The oldest female', timeLimit: 45, isIndiaThemed: false } },
  { type: 'comprehension', module: 'listening', question: { text: 'What is Diwali also known as?', audioText: 'Diwali is one of the biggest festivals in India. It is also called the Festival of Lights. People decorate their homes with diyas and rangoli. Families exchange sweets and gifts. Fireworks light up the night sky. The festival celebrates the victory of good over evil.', options: ['Festival of Colours', 'Festival of Lights', 'Festival of Music', 'Festival of Food'], correctOption: 'Festival of Lights', timeLimit: 45, isIndiaThemed: true } },
  { type: 'comprehension', module: 'listening', question: { text: 'What is the passage mainly about?', audioText: 'The water cycle is a continuous process. The sun heats water in oceans and lakes, turning it into water vapour. This vapour rises into the sky and forms clouds. When clouds get heavy enough, the water falls back as rain or snow. The water flows into rivers and back to the ocean, and the cycle starts again.', options: ['How rain is formed', 'How the water cycle works', 'Why oceans are salty', 'How clouds move'], correctOption: 'How the water cycle works', timeLimit: 45, isIndiaThemed: false } },
  { type: 'comprehension', module: 'listening', question: { text: 'When did the first train run in India?', audioText: 'The Indian railways is one of the largest railway networks in the world. Every day, more than 23 million passengers travel by train across India. The first train in India ran in 1853, between Mumbai and Thane. Today, Indian railways connects over 7000 stations.', options: ['1853', '1947', '1900', '1863'], correctOption: '1853', timeLimit: 45, isIndiaThemed: true } },
  { type: 'comprehension', module: 'listening', question: { text: 'What gas do plants release during photosynthesis?', audioText: 'Photosynthesis is how plants make their food. They use sunlight, water from the soil, and carbon dioxide from the air. The green colour in leaves, called chlorophyll, helps capture sunlight. Plants release oxygen as a result, which is what humans and animals breathe.', options: ['Carbon dioxide', 'Oxygen', 'Nitrogen', 'Hydrogen'], correctOption: 'Oxygen', timeLimit: 45, isIndiaThemed: false } },

  // follow_instructions (multi-step)
  { type: 'follow_instructions', module: 'listening', question: { text: 'What is the correct order of steps described?', audioText: 'First, pick up the red book from the table. Next, open it to page 25. Then, read the first paragraph. Finally, close the book and place it on the shelf.', options: ['Pick up book → Open to page 25 → Read first paragraph → Place on shelf', 'Open book → Read paragraph → Pick up book → Place on shelf', 'Place on shelf → Pick up book → Read paragraph → Open to page 25', 'Read paragraph → Open to page 25 → Pick up book → Place on shelf'], correctOption: 'Pick up book → Open to page 25 → Read first paragraph → Place on shelf', timeLimit: 45, isIndiaThemed: false } },
  { type: 'follow_instructions', module: 'listening', question: { text: 'What are the correct steps to make chai?', audioText: 'To make chai, first boil water in a pan. Add tea leaves and let them brew for two minutes. Then pour in milk and add sugar to taste. Let it simmer for one more minute. Finally, strain the chai into cups.', options: ['Boil water → Add tea leaves → Add milk and sugar → Simmer → Strain', 'Add milk → Boil water → Add sugar → Add tea leaves → Strain', 'Strain → Boil water → Add tea leaves → Add milk → Simmer', 'Boil water → Add milk → Add tea leaves → Strain → Simmer'], correctOption: 'Boil water → Add tea leaves → Add milk and sugar → Simmer → Strain', timeLimit: 45, isIndiaThemed: true } },
  { type: 'follow_instructions', module: 'listening', question: { text: 'What is the correct order to draw a house?', audioText: 'To draw a simple house, start by drawing a large square for the main structure. Add a triangle on top for the roof. Draw a small rectangle in the centre for the door. Finally, add two small squares on either side for windows.', options: ['Square → Triangle roof → Rectangle door → Square windows', 'Triangle → Square → Rectangle → Windows', 'Rectangle door → Square → Triangle → Windows', 'Windows → Square → Door → Triangle'], correctOption: 'Square → Triangle roof → Rectangle door → Square windows', timeLimit: 45, isIndiaThemed: false } },

  // key_points (write 3 key points)
  { type: 'key_points', module: 'listening', question: { text: 'What are 3 key facts about plastic pollution from the passage?', audioText: 'Plastic pollution is a serious problem for our planet. Every year, millions of tonnes of plastic end up in the ocean, harming marine animals. Sea turtles often mistake plastic bags for jellyfish and eat them. Many countries are now banning single-use plastics. Simple actions like using cloth bags and metal bottles can make a big difference.', timeLimit: 90, isIndiaThemed: false } },
  { type: 'key_points', module: 'listening', question: { text: 'What are 3 important facts about Indian wildlife mentioned in the passage?', audioText: 'India is home to many unique wildlife species. The Bengal tiger, found mainly in the Sundarbans and central Indian forests, is our national animal. The Asiatic lion lives only in the Gir forest of Gujarat. The Indian elephant, smaller than its African cousin, plays an important role in Indian culture and ecology. Many national parks work hard to protect these animals.', timeLimit: 90, isIndiaThemed: true } },
  { type: 'key_points', module: 'listening', question: { text: 'What are 3 key points about sleep that were mentioned?', audioText: 'Getting enough sleep is very important for young people. During sleep, your brain organises memories and helps you learn better. Children aged 8 to 12 need about 9 to 11 hours of sleep each night. Screen time before bed can make it harder to fall asleep. Having a regular bedtime routine helps your body know when it is time to rest.', timeLimit: 90, isIndiaThemed: false } },
  { type: 'key_points', module: 'listening', question: { text: 'What are 3 important details about the Chandrayaan-3 mission?', audioText: 'Chandrayaan-3 successfully landed on the Moon in August 2023, making India the fourth country to achieve a soft landing. The Vikram lander touched down near the lunar south pole, a region no other country had explored. The Pragyan rover collected data about the Moon soil. This mission cost less than many Hollywood movies, showing the world that great science does not need to be expensive.', timeLimit: 90, isIndiaThemed: true } },
];

// ─── Thinking Challenges ──────────────────────────────────

const THINKING_CHALLENGES: Omit<SkillArenaChallenge, 'id'>[] = [
  // logic (MCQ)
  { type: 'logic', module: 'thinking', question: { text: 'What comes next in the pattern? 2, 6, 18, 54, __', options: ['108', '162', '72', '216'], correctOption: '162', timeLimit: 60, isIndiaThemed: false } },
  { type: 'logic', module: 'thinking', question: { text: 'If all roses are flowers, and some flowers are red, which must be true?', options: ['All roses are red', 'Some roses are red', 'No roses are red', 'None of these must be true'], correctOption: 'None of these must be true', timeLimit: 60, isIndiaThemed: false } },
  { type: 'logic', module: 'thinking', question: { text: 'A train leaves Delhi at 9 AM going 60 km/h. Another train leaves Mumbai (1400 km away) at 9 AM going 80 km/h towards Delhi. At what time will they meet?', options: ['7 PM', '8 PM', '9 PM', '7:30 PM'], correctOption: '7 PM', timeLimit: 90, isIndiaThemed: true } },
  { type: 'logic', module: 'thinking', question: { text: 'Find the missing number: 1, 1, 2, 3, 5, 8, __', options: ['11', '12', '13', '10'], correctOption: '13', timeLimit: 60, isIndiaThemed: false } },
  { type: 'logic', module: 'thinking', question: { text: 'Riya is taller than Priya. Priya is taller than Diya. Diya is taller than Miya. Who is the shortest?', options: ['Riya', 'Priya', 'Diya', 'Miya'], correctOption: 'Miya', timeLimit: 45, isIndiaThemed: true } },

  // what_if (open-ended)
  { type: 'what_if', module: 'thinking', question: { text: 'What would happen if all the ice at the North Pole melted overnight? Explain your reasoning.', timeLimit: 90, isIndiaThemed: false } },
  { type: 'what_if', module: 'thinking', question: { text: 'What would happen if humans could photosynthesize like plants? How would our lives change?', timeLimit: 90, isIndiaThemed: false } },
  { type: 'what_if', module: 'thinking', question: { text: 'What would happen if India suddenly had no monsoon for an entire year? Think about the effects on people, animals, and farming.', timeLimit: 90, isIndiaThemed: true } },
  { type: 'what_if', module: 'thinking', question: { text: 'What would happen if every person in the world suddenly spoke the same language? Would it be good or bad?', timeLimit: 90, isIndiaThemed: false } },

  // odd_one_out (MCQ)
  { type: 'odd_one_out', module: 'thinking', question: { text: 'Which one does NOT belong? Explain why.', options: ['Carrot', 'Potato', 'Apple', 'Onion'], correctOption: 'Apple', timeLimit: 45, isIndiaThemed: false } },
  { type: 'odd_one_out', module: 'thinking', question: { text: 'Which does NOT belong in this group?', options: ['Tabla', 'Sitar', 'Veena', 'Dhoti'], correctOption: 'Dhoti', timeLimit: 45, isIndiaThemed: true } },
  { type: 'odd_one_out', module: 'thinking', question: { text: 'Find the odd one out', options: ['Mercury', 'Venus', 'Moon', 'Mars'], correctOption: 'Moon', timeLimit: 45, isIndiaThemed: false } },

  // analogy (MCQ)
  { type: 'analogy', module: 'thinking', question: { text: 'Book is to Reading as Fork is to __', options: ['Cooking', 'Eating', 'Cutting', 'Washing'], correctOption: 'Eating', timeLimit: 45, isIndiaThemed: false } },
  { type: 'analogy', module: 'thinking', question: { text: 'Delhi is to India as Tokyo is to __', options: ['China', 'Korea', 'Japan', 'Thailand'], correctOption: 'Japan', timeLimit: 45, isIndiaThemed: true } },
  { type: 'analogy', module: 'thinking', question: { text: 'Eye is to See as Ear is to __', options: ['Sound', 'Hear', 'Speak', 'Noise'], correctOption: 'Hear', timeLimit: 45, isIndiaThemed: false } },
  { type: 'analogy', module: 'thinking', question: { text: 'Pen is to Writer as Brush is to __', options: ['Teacher', 'Painter', 'Builder', 'Singer'], correctOption: 'Painter', timeLimit: 45, isIndiaThemed: false } },
];

// ─── Reading Challenges ───────────────────────────────────

const READING_CHALLENGES: Omit<SkillArenaChallenge, 'id'>[] = [
  // comprehension (passage + MCQ)
  { type: 'comprehension', module: 'reading', question: { text: 'Read the passage and answer the question: According to the passage, why are mangrove forests important?', passage: 'Mangrove forests grow along tropical coastlines. Their roots trap mud and sand, protecting the coast from waves and storms. Many fish and crabs begin their lives in mangrove waters. The Sundarbans, the largest mangrove forest in the world, is shared between India and Bangladesh. It is also home to the Royal Bengal Tiger.', options: ['They provide timber', 'They protect coastlines and support marine life', 'They are beautiful', 'They produce oxygen'], correctOption: 'They protect coastlines and support marine life', timeLimit: 90, isIndiaThemed: true } },
  { type: 'comprehension', module: 'reading', question: { text: 'Read and answer: What is the main purpose of GPS satellites?', passage: 'The Global Positioning System uses a network of 24 satellites orbiting the Earth. Each satellite sends radio signals that travel at the speed of light. A GPS receiver in your phone picks up signals from at least 4 satellites. By measuring how long each signal took to arrive, it calculates your exact position on Earth. This technology was originally built for the military but is now used by everyone.', options: ['To take photographs of Earth', 'To provide internet access', 'To help determine location on Earth', 'To study weather patterns'], correctOption: 'To help determine location on Earth', timeLimit: 90, isIndiaThemed: false } },
  { type: 'comprehension', module: 'reading', question: { text: 'Read and answer: What makes Khasi people unique according to this passage?', passage: 'In the hills of Meghalaya in northeast India, the Khasi people follow a matrilineal system. This means children take their mother\'s surname, not their father\'s. Property passes from mother to daughter. The youngest daughter inherits the family home. This is one of the few matrilineal societies remaining in the world.', options: ['They live in the mountains', 'Children take their mother\'s surname', 'They speak a rare language', 'They are farmers'], correctOption: 'Children take their mother\'s surname', timeLimit: 90, isIndiaThemed: true } },

  // inference
  { type: 'inference', module: 'reading', question: { text: 'Read and infer: Why was Raju probably feeling nervous?', passage: 'Raju checked his bag for the third time. Pencils, eraser, ruler, admit card — everything was there. His mother had packed two parathas and a banana for lunch. "You will do great," she said, squeezing his hand. Raju took a deep breath and stepped out of the auto-rickshaw at the school gate. The hallway was full of students whispering to each other.', options: ['He was going to a birthday party', 'He was taking an important exam', 'He was meeting new friends', 'He was going on a picnic'], correctOption: 'He was taking an important exam', timeLimit: 75, isIndiaThemed: true } },
  { type: 'inference', module: 'reading', question: { text: 'What can you conclude from this passage?', passage: 'The village had not seen rain in four months. The river bed was dry and cracked. Farmers stared at the sky every morning, hoping to see dark clouds. The price of vegetables at the local market had doubled. Some families had started walking to the next town to fetch water.', options: ['The village was facing a drought', 'It was winter in the village', 'The farmers were lazy', 'The village was near the sea'], correctOption: 'The village was facing a drought', timeLimit: 75, isIndiaThemed: true } },
  { type: 'inference', module: 'reading', question: { text: 'Read and infer: What is the author\'s attitude towards screen time?', passage: 'Studies show that children who spend more than two hours a day on screens have difficulty concentrating in class. Their sleep patterns are often disrupted. On the other hand, educational apps and coding games can develop problem-solving skills. The key is balance — using screens wisely rather than avoiding them altogether.', options: ['Completely against screen time', 'Thinks screens are harmful', 'Supports balanced and wise use', 'Thinks more screen time is better'], correctOption: 'Supports balanced and wise use', timeLimit: 75, isIndiaThemed: false } },

  // vocabulary
  { type: 'vocabulary', module: 'reading', question: { text: 'In the sentence "The resilient plant survived the harsh winter," what does "resilient" most likely mean?', passage: 'The resilient plant survived the harsh winter, growing back stronger in spring while the other plants had withered away.', options: ['Fragile and delicate', 'Able to recover from difficulty', 'Very tall and green', 'Beautiful and colourful'], correctOption: 'Able to recover from difficulty', timeLimit: 60, isIndiaThemed: false } },
  { type: 'vocabulary', module: 'reading', question: { text: 'What does "thriving" mean in this context?', passage: 'Despite facing many challenges, the small business in the village was thriving. More customers came every week, and the owner hired two new helpers.', options: ['Struggling', 'Failing', 'Growing successfully', 'Staying the same'], correctOption: 'Growing successfully', timeLimit: 60, isIndiaThemed: true } },
  { type: 'vocabulary', module: 'reading', question: { text: 'What does "meticulous" mean here?', passage: 'The artist was meticulous in her work, spending hours perfecting every tiny detail of the painting until it was exactly right.', options: ['Careless', 'Very careful and precise', 'Quick and efficient', 'Lazy'], correctOption: 'Very careful and precise', timeLimit: 60, isIndiaThemed: false } },

  // summarize (open-ended)
  { type: 'summarize', module: 'reading', question: { text: 'Read the passage and write a 2-sentence summary', passage: 'Solar energy is one of the cleanest sources of power. Solar panels convert sunlight into electricity without producing pollution. India receives abundant sunlight throughout the year, making it ideal for solar power. The Indian government has set ambitious goals to install solar panels across the country. Many villages that had no electricity now have solar-powered lights and fans. However, the initial cost of installing solar panels remains high for many families.', timeLimit: 120, isIndiaThemed: true } },
  { type: 'summarize', module: 'reading', question: { text: 'Summarize this passage in 2 sentences', passage: 'Honeybees are remarkable insects. A single hive can contain up to 60,000 bees working together. The queen bee lays all the eggs, while worker bees collect nectar from flowers. Bees communicate by doing special dances that tell other bees where to find food. Without bees, many of the fruits and vegetables we eat would not exist, because bees help pollinate the plants. Scientists are concerned because bee populations are declining in many parts of the world.', timeLimit: 120, isIndiaThemed: false } },
  { type: 'summarize', module: 'reading', question: { text: 'Write a 2-sentence summary of this passage', passage: 'The Ganges, or Ganga, is one of the most important rivers in India. It flows over 2500 kilometres from the Himalayas to the Bay of Bengal. Millions of people depend on its water for drinking, farming, and industry. The river is considered sacred by Hindus, who bathe in its waters during festivals. However, pollution from factories and cities has made parts of the river unsafe. The government launched the Namami Gange programme to clean and protect the river.', timeLimit: 120, isIndiaThemed: true } },
];

// ─── Challenge Pool Map ───────────────────────────────────

const MODULE_POOLS: Record<SkillArenaModule, Omit<SkillArenaChallenge, 'id'>[]> = {
  speaking: SPEAKING_CHALLENGES,
  listening: LISTENING_CHALLENGES,
  thinking: THINKING_CHALLENGES,
  reading: READING_CHALLENGES,
};

// ─── Difficulty filtering ─────────────────────────────────

/** Filter challenges by difficulty (affects passage length / complexity) */
function filterByDifficulty(
  challenges: Omit<SkillArenaChallenge, 'id'>[],
  difficulty: SkillArenaDifficulty,
): Omit<SkillArenaChallenge, 'id'>[] {
  // For now, all challenges are available at all difficulty levels.
  // Difficulty affects AI evaluation strictness, not question selection.
  // Future: tag challenges with difficulty and filter here.
  void difficulty;
  return challenges;
}

// ─── Repeat avoidance ─────────────────────────────────────

const RECENT_KEY_PREFIX = 'gsi-sa-recent-';
const MAX_RECENT = 5;

function getRecentIds(module: SkillArenaModule): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(`${RECENT_KEY_PREFIX}${module}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function trackRecent(module: SkillArenaModule, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${RECENT_KEY_PREFIX}${module}`;
    const existing = getRecentIds(module);
    const updated = [...ids, ...existing].slice(0, MAX_RECENT * 5);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // localStorage unavailable
  }
}

// ─── Public API ───────────────────────────────────────────

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `ch_${Date.now()}_${idCounter}`;
}

/** Pick 5 random challenges for a module, avoiding recent repeats */
export function getChallengesForModule(
  module: SkillArenaModule,
  difficulty: SkillArenaDifficulty,
  count: number = 10,
): SkillArenaChallenge[] {
  const pool = filterByDifficulty(MODULE_POOLS[module], difficulty);
  if (pool.length < count) {
    throw new Error(`Not enough challenges for module ${module}: need ${count}, have ${pool.length}`);
  }

  const recentTexts = getRecentIds(module);

  // Filter out recently used challenges (by question text)
  let available = pool.filter((c) => !recentTexts.includes(c.question.text));
  if (available.length < count) {
    available = pool; // Fall back to full pool
  }

  // Shuffle and pick
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  // Ensure variety of challenge types
  const typeGroups: Record<string, Omit<SkillArenaChallenge, 'id'>[]> = {};
  for (const c of shuffled) {
    const t = c.type as string;
    if (!typeGroups[t]) typeGroups[t] = [];
    typeGroups[t].push(c);
  }

  const picked: SkillArenaChallenge[] = [];
  const types = Object.keys(typeGroups);

  // Round-robin pick from each type for variety, then fill remaining
  let typeIdx = 0;
  while (picked.length < count) {
    const type = types[typeIdx % types.length]!;
    const group = typeGroups[type]!;
    if (group.length > 0) {
      const item = group.shift()!;
      picked.push({ ...item, id: generateId() });
    }
    typeIdx++;
    // Safety: if all groups empty, break
    if (types.every((t) => typeGroups[t]!.length === 0) && picked.length < count) {
      // Fill from shuffled remainder
      for (const c of shuffled) {
        if (picked.length >= count) break;
        if (!picked.some((p) => p.question.text === c.question.text)) {
          picked.push({ ...c, id: generateId() });
        }
      }
      break;
    }
  }

  // Track for repeat avoidance
  trackRecent(module, picked.map((c) => c.question.text));

  return picked.slice(0, count);
}

/** Get all challenges for a module (for testing/validation) */
export function getAllChallenges(module: SkillArenaModule): Omit<SkillArenaChallenge, 'id'>[] {
  return MODULE_POOLS[module];
}

/** Get the total count of challenges per module */
export function getChallengeCount(module: SkillArenaModule): number {
  return MODULE_POOLS[module].length;
}
