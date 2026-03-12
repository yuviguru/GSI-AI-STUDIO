import type {
  SkillArenaChallenge,
  SkillArenaChallengeType,
  SkillArenaDifficulty,
  SkillArenaModule,
  SkillArenaQuestion,
} from '@/types/mindx.types';

// ─── Question Banks ──────────────────────────────────────

interface QuestionEntry {
  type: SkillArenaChallengeType;
  module: SkillArenaModule;
  difficulty: SkillArenaDifficulty[];
  question: SkillArenaQuestion;
}

// ─── Speaking Questions ──────────────────────────────────

const speakingQuestions: QuestionEntry[] = [
  // read_aloud
  {
    type: 'read_aloud', module: 'speaking', difficulty: ['easy', 'medium'],
    question: {
      text: 'Read the following passage aloud clearly and at a comfortable pace.',
      passage: 'India is a land of festivals. Diwali, the festival of lights, is celebrated across the country with great joy. Families come together, light diyas, share sweets, and enjoy fireworks.',
      timeLimit: 45, isIndiaThemed: true,
    },
  },
  {
    type: 'read_aloud', module: 'speaking', difficulty: ['easy', 'medium'],
    question: {
      text: 'Read the following passage aloud clearly and at a comfortable pace.',
      passage: 'The Indian Space Research Organisation, or ISRO, has made India proud with missions like Chandrayaan and Mangalyaan. These missions show that with hard work and teamwork, we can reach the stars.',
      timeLimit: 45, isIndiaThemed: true,
    },
  },
  {
    type: 'read_aloud', module: 'speaking', difficulty: ['medium', 'hard'],
    question: {
      text: 'Read the following passage aloud with expression and clear pronunciation.',
      passage: 'The Western Ghats are one of the most biodiverse regions on Earth. Home to thousands of species of plants, animals, and birds, these ancient mountains run along the western coast of India, shaping the weather patterns and supporting millions of people who depend on their rivers and forests.',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'read_aloud', module: 'speaking', difficulty: ['hard'],
    question: {
      text: 'Read the following passage aloud with proper intonation and pacing.',
      passage: 'Artificial Intelligence is transforming how we live, work, and learn. From voice assistants that understand our questions to recommendation systems that suggest what to watch next, AI is quietly woven into our daily lives. Understanding how these systems work helps us become smarter users of technology.',
      timeLimit: 60, isIndiaThemed: false,
    },
  },
  {
    type: 'read_aloud', module: 'speaking', difficulty: ['easy'],
    question: {
      text: 'Read the following passage aloud clearly.',
      passage: 'Cricket is more than just a sport in India. On match days, streets become quiet as everyone gathers around screens. When India wins, the whole country celebrates together.',
      timeLimit: 30, isIndiaThemed: true,
    },
  },

  // describe
  {
    type: 'describe', module: 'speaking', difficulty: ['easy', 'medium'],
    question: {
      text: 'Describe your favourite festival. Talk about what happens during the festival, what you enjoy most, and why it is special to you.',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'describe', module: 'speaking', difficulty: ['easy', 'medium'],
    question: {
      text: 'Describe your school day. What do you do from morning to evening? What is your favourite part of the day?',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'describe', module: 'speaking', difficulty: ['medium', 'hard'],
    question: {
      text: 'Describe a time when you learned something new and difficult. How did you feel at first? What helped you learn it?',
      timeLimit: 90, isIndiaThemed: false,
    },
  },
  {
    type: 'describe', module: 'speaking', difficulty: ['hard'],
    question: {
      text: 'Imagine you are a tour guide showing a visitor around your city or town. Describe three interesting places they should visit and explain why each place is worth seeing.',
      timeLimit: 90, isIndiaThemed: true,
    },
  },
  {
    type: 'describe', module: 'speaking', difficulty: ['easy'],
    question: {
      text: 'Describe your favourite food. What does it taste like? Who makes it best?',
      timeLimit: 45, isIndiaThemed: true,
    },
  },

  // respond
  {
    type: 'respond', module: 'speaking', difficulty: ['easy', 'medium'],
    question: {
      text: 'If you could have any superpower, what would it be and how would you use it to help people?',
      timeLimit: 60, isIndiaThemed: false,
    },
  },
  {
    type: 'respond', module: 'speaking', difficulty: ['medium', 'hard'],
    question: {
      text: 'Do you think robots will replace teachers in the future? Why or why not?',
      timeLimit: 60, isIndiaThemed: false,
    },
  },
  {
    type: 'respond', module: 'speaking', difficulty: ['easy'],
    question: {
      text: 'What is your favourite sport or hobby? Why do you enjoy it?',
      timeLimit: 45, isIndiaThemed: false,
    },
  },
  {
    type: 'respond', module: 'speaking', difficulty: ['hard'],
    question: {
      text: 'Some people say that spending time in nature is important for children. Do you agree? Give reasons and examples from your own experience.',
      timeLimit: 90, isIndiaThemed: false,
    },
  },
  {
    type: 'respond', module: 'speaking', difficulty: ['medium'],
    question: {
      text: 'If you could change one thing about your school, what would it be and why?',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
];

// ─── Listening Questions ─────────────────────────────────

const listeningQuestions: QuestionEntry[] = [
  // comprehension
  {
    type: 'comprehension', module: 'listening', difficulty: ['easy', 'medium'],
    question: {
      text: 'Listen to the passage and answer the question.',
      audioText: 'Mahatma Gandhi believed in non-violence and truth. He led the freedom movement through peaceful protests. His birthday, October 2nd, is celebrated as Gandhi Jayanti across India.',
      options: ['August 15th', 'October 2nd', 'January 26th', 'November 14th'],
      correctOption: 'October 2nd',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'comprehension', module: 'listening', difficulty: ['easy', 'medium'],
    question: {
      text: 'Listen carefully and answer: What is the main topic of this passage?',
      audioText: 'The peacock is the national bird of India. It is known for its beautiful blue and green feathers. During the rainy season, peacocks dance with their feathers spread wide open, creating a spectacular sight.',
      options: ['The national flag', 'The peacock', 'The rainy season', 'Indian wildlife'],
      correctOption: 'The peacock',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'comprehension', module: 'listening', difficulty: ['medium', 'hard'],
    question: {
      text: 'Listen to the passage and answer the question.',
      audioText: 'The Indian monsoon is crucial for agriculture. About 60 percent of Indian farms depend on monsoon rains. When the monsoon is late or weak, it can lead to drought and food shortages. Scientists use satellites and weather models to predict monsoon patterns and help farmers prepare.',
      options: ['About 30 percent', 'About 60 percent', 'About 80 percent', 'About 90 percent'],
      correctOption: 'About 60 percent',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'comprehension', module: 'listening', difficulty: ['hard'],
    question: {
      text: 'Listen and answer: What can you infer about the future of solar energy from this passage?',
      audioText: 'India receives about 300 sunny days per year, making it ideal for solar energy. The government has set ambitious targets: 500 gigawatts of renewable energy by 2030. Solar panel costs have dropped by 90 percent in the last decade, making clean energy increasingly affordable for ordinary households.',
      options: [
        'Solar energy will become less important',
        'Solar energy will likely grow significantly in India',
        'Only the government can use solar energy',
        'Solar panels are too expensive for anyone'
      ],
      correctOption: 'Solar energy will likely grow significantly in India',
      timeLimit: 45, isIndiaThemed: true,
    },
  },
  {
    type: 'comprehension', module: 'listening', difficulty: ['easy'],
    question: {
      text: 'Listen and answer: What sport is being described?',
      audioText: 'This sport is played with a bat and a ball. There are two teams with eleven players each. One team bats while the other bowls and fields. It is the most popular sport in India.',
      options: ['Football', 'Hockey', 'Cricket', 'Badminton'],
      correctOption: 'Cricket',
      timeLimit: 30, isIndiaThemed: true,
    },
  },

  // follow_instructions
  {
    type: 'follow_instructions', module: 'listening', difficulty: ['easy', 'medium'],
    question: {
      text: 'Listen to the instructions and select the correct sequence.',
      audioText: 'First, take out your notebook. Next, write today\'s date at the top of the page. Then, draw a margin line on the left side. Finally, write the title of the lesson.',
      options: [
        'Notebook → Date → Margin → Title',
        'Date → Notebook → Title → Margin',
        'Notebook → Margin → Date → Title',
        'Title → Date → Notebook → Margin',
      ],
      correctOption: 'Notebook → Date → Margin → Title',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'follow_instructions', module: 'listening', difficulty: ['medium', 'hard'],
    question: {
      text: 'Listen to the recipe instructions and select the correct order.',
      audioText: 'To make masala chai, start by boiling water in a pot. Add crushed ginger and cardamom to the boiling water. Then add tea leaves and let them simmer for two minutes. Pour in the milk and bring it to a boil. Finally, strain the tea into cups and add sugar to taste.',
      options: [
        'Boil water → Add spices → Add tea → Add milk → Strain',
        'Add tea → Boil water → Add milk → Add spices → Strain',
        'Add milk → Boil water → Add spices → Add tea → Strain',
        'Boil water → Add tea → Add spices → Strain → Add milk',
      ],
      correctOption: 'Boil water → Add spices → Add tea → Add milk → Strain',
      timeLimit: 45, isIndiaThemed: true,
    },
  },
  {
    type: 'follow_instructions', module: 'listening', difficulty: ['easy'],
    question: {
      text: 'Listen and select the correct sequence of actions.',
      audioText: 'To get ready for school: First, brush your teeth. Second, take a bath. Third, put on your uniform. Last, pack your school bag.',
      options: [
        'Brush → Bath → Uniform → Pack bag',
        'Bath → Brush → Pack bag → Uniform',
        'Uniform → Brush → Bath → Pack bag',
        'Pack bag → Brush → Bath → Uniform',
      ],
      correctOption: 'Brush → Bath → Uniform → Pack bag',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'follow_instructions', module: 'listening', difficulty: ['hard'],
    question: {
      text: 'Listen to the experiment instructions and select the correct sequence.',
      audioText: 'For this science experiment: First, fill a glass with water up to the brim. Next, carefully place a piece of cardboard on top of the glass. Then, hold the cardboard firmly and flip the glass upside down. Now, slowly remove your hand from the cardboard. The cardboard stays in place because air pressure pushes up against it.',
      options: [
        'Fill glass → Place cardboard → Flip glass → Remove hand',
        'Place cardboard → Fill glass → Remove hand → Flip glass',
        'Fill glass → Flip glass → Place cardboard → Remove hand',
        'Flip glass → Fill glass → Place cardboard → Remove hand',
      ],
      correctOption: 'Fill glass → Place cardboard → Flip glass → Remove hand',
      timeLimit: 45, isIndiaThemed: false,
    },
  },

  // key_points
  {
    type: 'key_points', module: 'listening', difficulty: ['easy', 'medium'],
    question: {
      text: 'Listen to the passage, then write down the 3 most important points you heard.',
      audioText: 'The tiger is India\'s national animal. India has about 3,000 tigers living in the wild, mostly in national parks and tiger reserves. Project Tiger, started in 1973, has been crucial in protecting these magnificent animals from extinction.',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'key_points', module: 'listening', difficulty: ['medium', 'hard'],
    question: {
      text: 'Listen to the passage and write 3 key points you heard.',
      audioText: 'The human brain processes information using billions of neurons connected by synapses. When we learn something new, our brain creates new connections between neurons. The more we practice, the stronger these connections become. This is why repetition helps us remember things better. Sleep also plays an important role, as our brain strengthens important memories while we rest.',
      timeLimit: 90, isIndiaThemed: false,
    },
  },
  {
    type: 'key_points', module: 'listening', difficulty: ['easy'],
    question: {
      text: 'Listen to the passage and write 3 key points.',
      audioText: 'Water is essential for life. Our bodies are made up of about 60 percent water. Drinking enough water each day helps our brain work better, keeps our skin healthy, and gives us energy for activities.',
      timeLimit: 60, isIndiaThemed: false,
    },
  },
  {
    type: 'key_points', module: 'listening', difficulty: ['hard'],
    question: {
      text: 'Listen to the passage carefully and write 3 key points.',
      audioText: 'India\'s digital revolution has transformed how millions access services. The Unified Payments Interface, or UPI, processes over 10 billion transactions monthly, making India the world leader in digital payments. Aadhaar, the biometric identity system, covers over 1.3 billion people. Together with affordable smartphones and cheap data plans, these technologies have brought banking, education, and government services to even the remotest villages.',
      timeLimit: 90, isIndiaThemed: true,
    },
  },
];

// ─── Thinking Questions ──────────────────────────────────

const thinkingQuestions: QuestionEntry[] = [
  // logic
  {
    type: 'logic', module: 'thinking', difficulty: ['easy'],
    question: {
      text: 'What comes next in this pattern? 2, 4, 8, 16, __',
      options: ['18', '24', '32', '20'],
      correctOption: '32',
      timeLimit: 30, isIndiaThemed: false,
    },
  },
  {
    type: 'logic', module: 'thinking', difficulty: ['easy', 'medium'],
    question: {
      text: 'If all roses are flowers, and all flowers need water, then which statement is true?',
      options: [
        'All roses need water',
        'All water is flowers',
        'Some flowers are not roses',
        'Water needs roses',
      ],
      correctOption: 'All roses need water',
      timeLimit: 30, isIndiaThemed: false,
    },
  },
  {
    type: 'logic', module: 'thinking', difficulty: ['medium'],
    question: {
      text: 'What comes next? A1, B2, C3, D4, __',
      options: ['E5', 'F5', 'E6', 'D5'],
      correctOption: 'E5',
      timeLimit: 30, isIndiaThemed: false,
    },
  },
  {
    type: 'logic', module: 'thinking', difficulty: ['medium', 'hard'],
    question: {
      text: 'Riya is taller than Priya. Priya is taller than Siya. Meena is taller than Riya. Who is the shortest?',
      options: ['Riya', 'Priya', 'Siya', 'Meena'],
      correctOption: 'Siya',
      timeLimit: 45, isIndiaThemed: true,
    },
  },
  {
    type: 'logic', module: 'thinking', difficulty: ['hard'],
    question: {
      text: 'If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?',
      options: ['100 minutes', '5 minutes', '20 minutes', '1 minute'],
      correctOption: '5 minutes',
      timeLimit: 60, isIndiaThemed: false,
    },
  },

  // what_if
  {
    type: 'what_if', module: 'thinking', difficulty: ['easy', 'medium'],
    question: {
      text: 'What would happen if there were no trees on Earth? Write your thoughts explaining at least two effects.',
      timeLimit: 90, isIndiaThemed: false,
    },
  },
  {
    type: 'what_if', module: 'thinking', difficulty: ['medium', 'hard'],
    question: {
      text: 'What would happen if every student in India had free access to the internet and a computer? Think about both positive effects and possible challenges.',
      timeLimit: 90, isIndiaThemed: true,
    },
  },
  {
    type: 'what_if', module: 'thinking', difficulty: ['easy'],
    question: {
      text: 'What would happen if it rained candy instead of water for one day? Describe what you think would happen.',
      timeLimit: 60, isIndiaThemed: false,
    },
  },
  {
    type: 'what_if', module: 'thinking', difficulty: ['hard'],
    question: {
      text: 'What would happen if AI could perfectly understand and respond to every human emotion? How would this change schools, hospitals, and families?',
      timeLimit: 90, isIndiaThemed: false,
    },
  },

  // odd_one_out
  {
    type: 'odd_one_out', module: 'thinking', difficulty: ['easy'],
    question: {
      text: 'Which one does NOT belong? Explain why.',
      options: ['Mango', 'Apple', 'Carrot', 'Banana'],
      correctOption: 'Carrot',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'odd_one_out', module: 'thinking', difficulty: ['easy', 'medium'],
    question: {
      text: 'Which one does NOT belong? Explain your reasoning.',
      options: ['Delhi', 'Mumbai', 'London', 'Chennai'],
      correctOption: 'London',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'odd_one_out', module: 'thinking', difficulty: ['medium', 'hard'],
    question: {
      text: 'Which one does NOT belong? Explain your reasoning.',
      options: ['Keyboard', 'Mouse', 'Monitor', 'CPU'],
      correctOption: 'CPU',
      timeLimit: 45, isIndiaThemed: false,
    },
  },
  {
    type: 'odd_one_out', module: 'thinking', difficulty: ['hard'],
    question: {
      text: 'Which one does NOT belong? Give a detailed explanation.',
      options: ['Classification', 'Regression', 'Photosynthesis', 'Clustering'],
      correctOption: 'Photosynthesis',
      timeLimit: 45, isIndiaThemed: false,
    },
  },

  // analogy
  {
    type: 'analogy', module: 'thinking', difficulty: ['easy'],
    question: {
      text: 'Complete the analogy: Book is to Reading as Bat is to __',
      options: ['Cricket', 'Animal', 'Night', 'Wood'],
      correctOption: 'Cricket',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'analogy', module: 'thinking', difficulty: ['easy', 'medium'],
    question: {
      text: 'Complete the analogy: Doctor is to Hospital as Teacher is to __',
      options: ['Student', 'School', 'Books', 'Learning'],
      correctOption: 'School',
      timeLimit: 30, isIndiaThemed: false,
    },
  },
  {
    type: 'analogy', module: 'thinking', difficulty: ['medium', 'hard'],
    question: {
      text: 'Complete the analogy: Brush is to Painting as Chisel is to __',
      options: ['Hammer', 'Sculpture', 'Metal', 'Art'],
      correctOption: 'Sculpture',
      timeLimit: 45, isIndiaThemed: false,
    },
  },
  {
    type: 'analogy', module: 'thinking', difficulty: ['hard'],
    question: {
      text: 'Complete the analogy: Data is to Algorithm as Ingredients is to __',
      options: ['Kitchen', 'Recipe', 'Chef', 'Food'],
      correctOption: 'Recipe',
      timeLimit: 45, isIndiaThemed: false,
    },
  },
];

// ─── Reading Questions ───────────────────────────────────

const readingQuestions: QuestionEntry[] = [
  // comprehension
  {
    type: 'comprehension', module: 'reading', difficulty: ['easy', 'medium'],
    question: {
      text: 'Read the passage and answer: What does Holi celebrate?',
      passage: 'Holi is one of India\'s most colourful festivals. It celebrates the victory of good over evil and the arrival of spring. People throw coloured powders called gulal at each other, dance to music, and share special sweets like gujiya. The festival brings people of all ages together in joyful celebration.',
      options: [
        'The harvest season',
        'The victory of good over evil and spring',
        'Independence Day',
        'The start of winter',
      ],
      correctOption: 'The victory of good over evil and spring',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'comprehension', module: 'reading', difficulty: ['medium'],
    question: {
      text: 'Read the passage and answer: Why is the banyan tree considered special in India?',
      passage: 'The banyan tree is India\'s national tree. It is known for its aerial roots that grow down from its branches and take root in the soil, making the tree appear to have many trunks. A single banyan tree can cover a huge area, providing shade to hundreds of people. In Indian culture, the banyan tree symbolises immortality and is often found near temples and village centres.',
      options: [
        'It produces the most fruit',
        'It is the tallest tree in India',
        'It symbolises immortality and provides shade with its spreading roots',
        'It only grows near rivers',
      ],
      correctOption: 'It symbolises immortality and provides shade with its spreading roots',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'comprehension', module: 'reading', difficulty: ['medium', 'hard'],
    question: {
      text: 'Read the passage and answer the question.',
      passage: 'Machine learning is a branch of AI where computers learn from data instead of being explicitly programmed. For example, a spam filter learns to identify spam emails by studying thousands of examples of spam and non-spam messages. Over time, it becomes better at spotting patterns. The more data it processes, the more accurate its predictions become.',
      options: [
        'Computers are programmed with specific rules for every situation',
        'Computers learn patterns from data to make predictions',
        'Machine learning only works with email',
        'Computers need no data to learn',
      ],
      correctOption: 'Computers learn patterns from data to make predictions',
      timeLimit: 60, isIndiaThemed: false,
    },
  },
  {
    type: 'comprehension', module: 'reading', difficulty: ['easy'],
    question: {
      text: 'Read and answer: How many players are on a kabaddi team?',
      passage: 'Kabaddi is a popular Indian sport that requires no equipment. Two teams of seven players each take turns sending a raider into the other half. The raider must touch opponents and return to their side, all while holding their breath and chanting "kabaddi, kabaddi."',
      options: ['5', '7', '11', '9'],
      correctOption: '7',
      timeLimit: 45, isIndiaThemed: true,
    },
  },

  // inference
  {
    type: 'inference', module: 'reading', difficulty: ['easy', 'medium'],
    question: {
      text: 'Read the passage and choose what you can conclude.',
      passage: 'Aarav checked his cricket bat, packed his water bottle, and put on his white shoes. He asked his mother if she had ironed his white clothes. She smiled and handed him a freshly ironed set.',
      options: [
        'Aarav is going to school',
        'Aarav is preparing to play a cricket match',
        'Aarav is going to a wedding',
        'Aarav is going shopping',
      ],
      correctOption: 'Aarav is preparing to play a cricket match',
      timeLimit: 45, isIndiaThemed: true,
    },
  },
  {
    type: 'inference', module: 'reading', difficulty: ['medium', 'hard'],
    question: {
      text: 'What can you infer from this passage?',
      passage: 'The village well had been dry for three months. The fields were brown and cracked. Every morning, Sunita walked five kilometres to the river to fill two large pots with water. Her back ached, but her family needed the water for drinking and cooking.',
      options: [
        'Sunita enjoys walking long distances',
        'The village is experiencing a severe drought',
        'The river is very close to the village',
        'Sunita has plenty of water at home',
      ],
      correctOption: 'The village is experiencing a severe drought',
      timeLimit: 45, isIndiaThemed: true,
    },
  },
  {
    type: 'inference', module: 'reading', difficulty: ['hard'],
    question: {
      text: 'What can you infer about the narrator\'s feelings?',
      passage: 'I stared at the acceptance letter for the third time, my hands trembling slightly. The words "Congratulations" seemed to glow on the page. I thought of all those late nights studying, the practice problems, and the times I almost gave up. I reached for my phone to call Amma first.',
      options: [
        'The narrator is disappointed',
        'The narrator is proud and emotional after achieving something difficult',
        'The narrator is confused about the letter',
        'The narrator wants to complain to their mother',
      ],
      correctOption: 'The narrator is proud and emotional after achieving something difficult',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'inference', module: 'reading', difficulty: ['easy'],
    question: {
      text: 'What can you conclude from the passage?',
      passage: 'Meera put on her raincoat and picked up her umbrella. She looked out the window and sighed. The playground was full of puddles.',
      options: [
        'It is a sunny day',
        'It is raining or has just rained',
        'Meera is going swimming',
        'Meera likes puddles',
      ],
      correctOption: 'It is raining or has just rained',
      timeLimit: 30, isIndiaThemed: true,
    },
  },

  // vocabulary
  {
    type: 'vocabulary', module: 'reading', difficulty: ['easy', 'medium'],
    question: {
      text: 'What does the word "magnificent" mean in this sentence? "The Taj Mahal is a magnificent monument built by Shah Jahan."',
      options: ['Very old', 'Very grand and impressive', 'Very small', 'Very expensive'],
      correctOption: 'Very grand and impressive',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'vocabulary', module: 'reading', difficulty: ['medium'],
    question: {
      text: 'What does "resilient" mean in this sentence? "Despite facing many floods, the resilient villagers always rebuilt their homes."',
      options: [
        'Weak and giving up easily',
        'Able to recover quickly from difficulties',
        'Rich and powerful',
        'Living near water',
      ],
      correctOption: 'Able to recover quickly from difficulties',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'vocabulary', module: 'reading', difficulty: ['medium', 'hard'],
    question: {
      text: 'What does "sustainable" mean in this context? "India is working towards sustainable energy sources to reduce pollution."',
      options: [
        'Very fast and powerful',
        'Can be maintained without harming the environment',
        'Expensive but worth it',
        'Only used by the government',
      ],
      correctOption: 'Can be maintained without harming the environment',
      timeLimit: 30, isIndiaThemed: true,
    },
  },
  {
    type: 'vocabulary', module: 'reading', difficulty: ['hard'],
    question: {
      text: 'What does "algorithm" mean in this passage? "Search engines use algorithms to find the most relevant results for your query."',
      options: [
        'A type of computer hardware',
        'A step-by-step set of instructions for solving a problem',
        'A programming language',
        'A type of internet connection',
      ],
      correctOption: 'A step-by-step set of instructions for solving a problem',
      timeLimit: 45, isIndiaThemed: false,
    },
  },
  {
    type: 'vocabulary', module: 'reading', difficulty: ['easy'],
    question: {
      text: 'What does "ancient" mean? "India has many ancient temples that are hundreds of years old."',
      options: ['Very new', 'Very big', 'Very old', 'Very beautiful'],
      correctOption: 'Very old',
      timeLimit: 30, isIndiaThemed: true,
    },
  },

  // summarize
  {
    type: 'summarize', module: 'reading', difficulty: ['easy', 'medium'],
    question: {
      text: 'Read the passage and write a 2-sentence summary.',
      passage: 'The Indian railway system is one of the largest in the world. It carries over 23 million passengers every day across a network of more than 67,000 kilometres of track. Indian Railways connects even the most remote villages to big cities, making it a lifeline for millions. The railway system also moves goods across the country, supporting trade and the economy.',
      timeLimit: 90, isIndiaThemed: true,
    },
  },
  {
    type: 'summarize', module: 'reading', difficulty: ['medium', 'hard'],
    question: {
      text: 'Read and write a 2-sentence summary of the main ideas.',
      passage: 'Natural Language Processing, or NLP, is a branch of AI that helps computers understand human language. When you ask a voice assistant a question, NLP breaks down your words, figures out what you mean, and generates an appropriate response. NLP powers translation apps, chatbots, and even tools that check your grammar. As NLP improves, computers are getting better at understanding context, sarcasm, and even emotions in text.',
      timeLimit: 90, isIndiaThemed: false,
    },
  },
  {
    type: 'summarize', module: 'reading', difficulty: ['easy'],
    question: {
      text: 'Write a 2-sentence summary of this passage.',
      passage: 'Yoga began in India thousands of years ago. It combines breathing exercises, body poses, and meditation. Yoga helps people stay fit, calm, and focused. Today, people all around the world practice yoga for good health.',
      timeLimit: 60, isIndiaThemed: true,
    },
  },
  {
    type: 'summarize', module: 'reading', difficulty: ['hard'],
    question: {
      text: 'Summarize this passage in exactly 2 sentences.',
      passage: 'The Indian constitution, adopted on 26 January 1950, is the longest written constitution in the world. It was drafted by a committee led by Dr. B.R. Ambedkar over nearly three years. The constitution guarantees fundamental rights to all citizens, including the right to equality, freedom of speech, and the right to education. It also establishes the structure of government with three branches: legislative, executive, and judicial. The constitution has been amended over 100 times to adapt to changing times while preserving its core principles.',
      timeLimit: 120, isIndiaThemed: true,
    },
  },
];

// ─── All Questions ───────────────────────────────────────

const ALL_QUESTIONS: QuestionEntry[] = [
  ...speakingQuestions,
  ...listeningQuestions,
  ...thinkingQuestions,
  ...readingQuestions,
];

// ─── Public API ──────────────────────────────────────────

/** Get random challenges for a module at a given difficulty */
export function getRandomChallenges(
  module: SkillArenaModule,
  difficulty: SkillArenaDifficulty,
  count: number = 5,
): SkillArenaChallenge[] {
  // Filter questions by module and difficulty
  const pool = ALL_QUESTIONS.filter(
    (q) => q.module === module && q.difficulty.includes(difficulty),
  );

  if (pool.length === 0) {
    throw new Error(`No questions found for module=${module}, difficulty=${difficulty}`);
  }

  // Shuffle and pick, ensuring variety of challenge types
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  // Try to get one of each type first, then fill remaining
  const typesSeen = new Set<string>();
  const selected: QuestionEntry[] = [];
  const remaining: QuestionEntry[] = [];

  for (const q of shuffled) {
    if (!typesSeen.has(q.type) && selected.length < count) {
      typesSeen.add(q.type);
      selected.push(q);
    } else {
      remaining.push(q);
    }
  }

  // Fill up to count from remaining
  for (const q of remaining) {
    if (selected.length >= count) break;
    selected.push(q);
  }

  // Convert to challenges with unique IDs
  return selected.map((entry, i) => ({
    id: `${module}-${difficulty}-${i}-${Date.now()}`,
    type: entry.type,
    module: entry.module,
    question: entry.question,
  }));
}

/** Get all questions for a module (for testing/validation) */
export function getQuestionsByModule(module: SkillArenaModule): QuestionEntry[] {
  return ALL_QUESTIONS.filter((q) => q.module === module);
}

/** Get total question count */
export function getTotalQuestionCount(): number {
  return ALL_QUESTIONS.length;
}
