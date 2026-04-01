import type { BeatTheAiCategory, BeatTheAiPrompt } from '@/types/beatTheAi.types';

// ─── Prompt Bank ────────────────────────────────────────────

const STORY_SPRINT_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Write a short story about an auto-rickshaw that can fly', theme: 'Transportation', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a cricket ball that grants wishes', theme: 'Sports & Magic', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about finding a treasure map inside a samosa', theme: 'Food & Adventure', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a monsoon rain that turns everything colorful', theme: 'Nature', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a school where the homework does itself', theme: 'School', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a Diwali firecracker that opens a portal', theme: 'Festival', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a robot that learns to dance Bharatanatyam', theme: 'Dance & Technology', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a chai stall on the moon', theme: 'Space', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a lost puppy in a Rajasthani palace', theme: 'Animals', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a kid who can talk to trees', theme: 'Nature', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a magic school tiffin box', theme: 'School', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a time machine hidden in a library', theme: 'Time Travel', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a Holi celebration where colors come alive', theme: 'Festival', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a gully cricket match with unexpected twist', theme: 'Sports', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a talking parrot who solves mysteries', theme: 'Mystery', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about ISRO launching a rocket to a candy planet', theme: 'Space', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a grandmother with a secret superpower', theme: 'Family', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a train journey where something magical happens', theme: 'Travel', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a mango tree that grows gadgets', theme: 'Nature & Tech', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
  { text: 'Write a short story about a friendship between a kid and a cloud', theme: 'Friendship', timeLimit: 180, category: 'story_sprint', isIndiaThemed: false },
  { text: 'Write a short story about a rangoli pattern that comes alive', theme: 'Art', timeLimit: 180, category: 'story_sprint', isIndiaThemed: true },
];

const RHYME_TIME_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Write a 4-line rhyming poem about monsoon rain', theme: 'Nature', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a lazy Sunday', theme: 'Daily Life', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about chai and biscuits', theme: 'Food', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about the moon', theme: 'Space', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about school friends', theme: 'Friendship', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a Diwali night', theme: 'Festival', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a butterfly', theme: 'Nature', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a train whistle at night', theme: 'Travel', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about ice cream melting in summer', theme: 'Seasons', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about flying kites on Makar Sankranti', theme: 'Festival', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a dream you had', theme: 'Imagination', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about mangoes in summer', theme: 'Seasons', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a secret hideout', theme: 'Adventure', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about the first day of school', theme: 'School', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a grandmother\'s stories', theme: 'Family', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about a rainy cricket match', theme: 'Sports', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about the color orange', theme: 'Colors', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a river flowing through hills', theme: 'Nature', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
  { text: 'Write a 4-line rhyming poem about bedtime', theme: 'Daily Life', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: false },
  { text: 'Write a 4-line rhyming poem about a peacock dancing', theme: 'Wildlife', timeLimit: 120, category: 'rhyme_time', isIndiaThemed: true },
];

// ─── New Creative Categories ────────────────────────────────

const FACT_OR_BLUFF_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Write a surprising fact OR a convincing bluff about Indian railways', theme: 'Transport', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about octopuses', theme: 'Animals', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about ISRO\'s space missions', theme: 'Space', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about cricket world records', theme: 'Cricket', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about the human brain', theme: 'Biology', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about Indian spices', theme: 'Food', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about volcanoes', theme: 'Geology', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about the Taj Mahal', theme: 'History', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about dolphins', theme: 'Marine Life', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about how WiFi works', theme: 'Technology', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about Bollywood', theme: 'Movies', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about honeybees', theme: 'Nature', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about the Indian flag', theme: 'History', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about black holes', theme: 'Space', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about ancient Indian mathematics', theme: 'Maths', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about the speed of light', theme: 'Physics', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about Mughal architecture', theme: 'Architecture', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about thunderstorms', theme: 'Weather', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
  { text: 'Write a surprising fact OR a convincing bluff about Indian snakes', theme: 'Wildlife', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: true },
  { text: 'Write a surprising fact OR a convincing bluff about how planes fly', theme: 'Aviation', timeLimit: 90, category: 'fact_or_bluff', isIndiaThemed: false },
];

const COMEBACK_KING_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Your friend says: "Maggi is NOT real food." Write your best comeback!', theme: 'Food Wars', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "AI will replace all humans someday." Write your best comeback!', theme: 'Tech Debate', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Reading books is boring." Write your best comeback!', theme: 'Books', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Cricket is just hitting a ball." Write your best comeback!', theme: 'Sports', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "Homework is a waste of time." Write your best comeback!', theme: 'School', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Cats are better than dogs." Write your best comeback!', theme: 'Pets', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Summer vacation is too long." Write your best comeback!', theme: 'Holidays', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Dosa is just a thin pancake." Write your best comeback!', theme: 'Food Wars', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "History is the most boring subject." Write your best comeback!', theme: 'School', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Maths is useless in real life." Write your best comeback!', theme: 'Maths', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Train journeys are boring." Write your best comeback!', theme: 'Travel', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "Being a kid is harder than being an adult." Write your best comeback!', theme: 'Life', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Pani puri is overrated." Write your best comeback!', theme: 'Food Wars', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "Morning assembly should be cancelled." Write your best comeback!', theme: 'School', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "Mobile phones are bad for kids." Write your best comeback!', theme: 'Tech', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Rainy days are the worst." Write your best comeback!', theme: 'Weather', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "Biryani is just rice with stuff in it." Write your best comeback!', theme: 'Food Wars', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "Superheroes aren\'t cool anymore." Write your best comeback!', theme: 'Pop Culture', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
  { text: 'Your friend says: "School uniforms should be banned." Write your best comeback!', theme: 'School', timeLimit: 60, category: 'comeback_king', isIndiaThemed: true },
  { text: 'Your friend says: "Video games are a waste of time." Write your best comeback!', theme: 'Gaming', timeLimit: 60, category: 'comeback_king', isIndiaThemed: false },
];

const EXPLAIN_IT_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Explain how WiFi works so a 7-year-old would understand', theme: 'Technology', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain gravity so a 7-year-old would understand', theme: 'Physics', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how Chandrayaan reached the Moon so a 7-year-old would understand', theme: 'Space & ISRO', timeLimit: 120, category: 'explain_it', isIndiaThemed: true },
  { text: 'Explain photosynthesis so a 7-year-old would understand', theme: 'Biology', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how monsoons work so a 7-year-old would understand', theme: 'Weather', timeLimit: 120, category: 'explain_it', isIndiaThemed: true },
  { text: 'Explain democracy so a 7-year-old would understand', theme: 'Civics', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how a search engine works so a 7-year-old would understand', theme: 'Technology', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain what DNA is so a 7-year-old would understand', theme: 'Biology', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how Indian satellites help farmers so a 7-year-old would understand', theme: 'Space & Agriculture', timeLimit: 120, category: 'explain_it', isIndiaThemed: true },
  { text: 'Explain electricity so a 7-year-old would understand', theme: 'Physics', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how vaccines work so a 7-year-old would understand', theme: 'Health', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain the Indian Constitution so a 7-year-old would understand', theme: 'Civics', timeLimit: 120, category: 'explain_it', isIndiaThemed: true },
  { text: 'Explain how clouds form so a 7-year-old would understand', theme: 'Weather', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how an AI chatbot works so a 7-year-old would understand', theme: 'AI', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain what the stock market is so a 7-year-old would understand', theme: 'Finance', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how UPI payments work so a 7-year-old would understand', theme: 'Technology', timeLimit: 120, category: 'explain_it', isIndiaThemed: true },
  { text: 'Explain why the sky is blue so a 7-year-old would understand', theme: 'Physics', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how a rocket engine works so a 7-year-old would understand', theme: 'Space', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain the water cycle so a 7-year-old would understand', theme: 'Geography', timeLimit: 120, category: 'explain_it', isIndiaThemed: false },
  { text: 'Explain how Indian railways run on time so a 7-year-old would understand', theme: 'Transport', timeLimit: 120, category: 'explain_it', isIndiaThemed: true },
];

const DEBATE_CHAMP_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Debate: "Maggi vs Dosa, which is the better snack?" You argue FOR Maggi. Make your case!', theme: 'Food Wars', timeLimit: 120, category: 'debate_champ', isIndiaThemed: true },
  { text: 'Debate: "Should homework be banned?" You argue FOR banning it. Make your case!', theme: 'School', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Cats vs Dogs, which pet is better?" You argue FOR cats. Make your case!', theme: 'Pets', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Summer vs Winter, which season is better?" You argue FOR summer. Make your case!', theme: 'Seasons', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Should kids get pocket money for doing chores?" You argue FOR it. Make your case!', theme: 'Money', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Biryani vs Pizza, which is the ultimate comfort food?" You argue FOR biryani. Make your case!', theme: 'Food Wars', timeLimit: 120, category: 'debate_champ', isIndiaThemed: true },
  { text: 'Debate: "Should school start at 10 AM instead of 8 AM?" You argue FOR late start. Make your case!', theme: 'School', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Books vs Movies, which tells better stories?" You argue FOR books. Make your case!', theme: 'Entertainment', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Should exams be replaced with projects?" You argue FOR projects. Make your case!', theme: 'Education', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Cricket vs Football, which is the more exciting sport?" You argue FOR cricket. Make your case!', theme: 'Sports', timeLimit: 120, category: 'debate_champ', isIndiaThemed: true },
  { text: 'Debate: "City life vs Village life, which is better for kids?" You argue FOR village life. Make your case!', theme: 'Lifestyle', timeLimit: 120, category: 'debate_champ', isIndiaThemed: true },
  { text: 'Debate: "Should all kids learn coding?" You argue FOR it. Make your case!', theme: 'Education', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Morning person vs Night owl, which is better?" You argue FOR morning person. Make your case!', theme: 'Lifestyle', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Train vs Plane, which is the better way to travel in India?" You argue FOR train. Make your case!', theme: 'Travel', timeLimit: 120, category: 'debate_champ', isIndiaThemed: true },
  { text: 'Debate: "Should kids have social media accounts?" You argue AGAINST it. Make your case!', theme: 'Tech & Society', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Mango vs Strawberry, which is the king of fruits?" You argue FOR mango. Make your case!', theme: 'Food Wars', timeLimit: 120, category: 'debate_champ', isIndiaThemed: true },
  { text: 'Debate: "Is it better to be smart or kind?" You argue FOR kindness. Make your case!', theme: 'Values', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Should uniforms be replaced with casual wear in schools?" You argue FOR uniforms. Make your case!', theme: 'School', timeLimit: 120, category: 'debate_champ', isIndiaThemed: true },
  { text: 'Debate: "Is exploring space more important than exploring the ocean?" You argue FOR ocean. Make your case!', theme: 'Science', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
  { text: 'Debate: "Should kids be allowed to choose what they study?" You argue FOR free choice. Make your case!', theme: 'Education', timeLimit: 120, category: 'debate_champ', isIndiaThemed: false },
];

// ─── Analytical Categories ──────────────────────────────────

const MATH_WIZARD_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'Estimate: How many auto-rickshaws are there in Mumbai? Explain your reasoning step by step!', theme: 'Fermi Estimate', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'A train leaves Delhi at 6 AM going 80 km/h. Another leaves Jaipur (280 km away) at 7 AM going 100 km/h toward Delhi. When do they meet? Show your working!', theme: 'Speed & Distance', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'You have ₹500 to buy snacks for 8 friends. Samosa costs ₹15, juice ₹30. How do you feed everyone and have the most left over? Show your thinking!', theme: 'Budget Maths', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'What comes next in the pattern: 2, 6, 12, 20, 30, ? Explain why!', theme: 'Number Patterns', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'Estimate: How many litres of water does your school use in a day? Explain your reasoning!', theme: 'Fermi Estimate', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'A shopkeeper gives 20% off, then another 10% off the sale price. Is that the same as 30% off? Prove it with an example!', theme: 'Percentages', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'You need to tile a 12m × 8m room with square tiles of 0.5m each. How many tiles do you need? What if 5% break? Show your working!', theme: 'Area', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'Estimate: How many chapatis does India eat in one day? Explain your reasoning step by step!', theme: 'Fermi Estimate', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'If you fold a piece of paper in half 10 times, how thick would it be? A sheet is 0.1mm. Explain your thinking!', theme: 'Exponential Growth', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'Three friends share a pizza: Aarav eats 1/3, Priya eats 1/4, and Riya eats 1/6. How much is left? Show your steps!', theme: 'Fractions', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'A cricket team scored 150 runs in 20 overs. Their run rate in the first 10 overs was 6. What run rate do they need in the last 10? Show your working!', theme: 'Cricket Maths', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'If you saved ₹1 on day 1, ₹2 on day 2, ₹4 on day 3, doubling each day, how much would you have after 15 days? Explain!', theme: 'Exponential Growth', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'A rectangular garden is 3 times as long as it is wide. If the perimeter is 48m, what are the dimensions? Show your reasoning!', theme: 'Geometry', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'Estimate: How many words do you speak in a single school day? Explain your reasoning!', theme: 'Fermi Estimate', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'If 3 painters can paint a wall in 4 hours, how long would 5 painters take? What about 1 painter? Show your logic!', theme: 'Ratio & Proportion', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'A bus route has 12 stops. How many different trips are possible if you can board at any stop and exit at any later stop? Explain!', theme: 'Combinations', timeLimit: 90, category: 'math_wizard', isIndiaThemed: true },
  { text: 'What is 25% of 80, plus 80% of 25? Are they the same? Why or why not? Prove it!', theme: 'Percentages', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'You roll two dice. What is the probability that their sum is 7? List all possible combinations!', theme: 'Probability', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'Estimate: How many stairs are there in a typical 10-floor apartment building? Explain your reasoning!', theme: 'Fermi Estimate', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
  { text: 'A clock shows 3:15. What is the angle between the hour hand and the minute hand? Show your working!', theme: 'Geometry & Time', timeLimit: 90, category: 'math_wizard', isIndiaThemed: false },
];

const SCIENCE_DETECTIVE_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'What would happen if Earth had no moon? Write your hypothesis!', theme: 'Astronomy', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if humans could photosynthesize like plants? Write your hypothesis!', theme: 'Biology', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if gravity suddenly doubled? Write your hypothesis!', theme: 'Physics', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if all ice on Earth melted overnight? Write your hypothesis!', theme: 'Climate', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if you shrank to the size of an ant? Write your hypothesis!', theme: 'Scale & Physics', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if India had no monsoon season for a year? Write your hypothesis!', theme: 'Climate & Agriculture', timeLimit: 120, category: 'science_detective', isIndiaThemed: true },
  { text: 'What would happen if the Sun was twice as far from Earth? Write your hypothesis!', theme: 'Astronomy', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if all insects disappeared from Earth? Write your hypothesis!', theme: 'Ecology', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if the Ganges river dried up completely? Write your hypothesis!', theme: 'Geography & Society', timeLimit: 120, category: 'science_detective', isIndiaThemed: true },
  { text: 'What would happen if humans could breathe underwater? Write your hypothesis!', theme: 'Biology', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if Earth spun twice as fast? Write your hypothesis!', theme: 'Physics', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if trees could walk and move around? Write your hypothesis!', theme: 'Biology & Ecology', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if the Himalayas suddenly disappeared? Write your hypothesis!', theme: 'Geography', timeLimit: 120, category: 'science_detective', isIndiaThemed: true },
  { text: 'What would happen if you could only eat one type of food forever? Write your hypothesis!', theme: 'Nutrition', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if sound traveled as fast as light? Write your hypothesis!', theme: 'Physics', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if tigers became herbivores? Write your hypothesis!', theme: 'Ecology', timeLimit: 120, category: 'science_detective', isIndiaThemed: true },
  { text: 'What would happen if there was no friction? Write your hypothesis!', theme: 'Physics', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if humans had eyes that could see ultraviolet light? Write your hypothesis!', theme: 'Biology', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
  { text: 'What would happen if the Indian Ocean became freshwater? Write your hypothesis!', theme: 'Marine Science', timeLimit: 120, category: 'science_detective', isIndiaThemed: true },
  { text: 'What would happen if Earth had rings like Saturn? Write your hypothesis!', theme: 'Astronomy', timeLimit: 120, category: 'science_detective', isIndiaThemed: false },
];

const CODE_CRACKER_PROMPTS: BeatTheAiPrompt[] = [
  { text: 'I have cities but no houses, forests but no trees, water but no fish. What am I? Solve it and explain your thinking!', theme: 'Riddle', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'What comes next: 1, 1, 2, 3, 5, 8, 13, ? Explain the pattern!', theme: 'Number Pattern', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'Decode this cipher: KHOOR ZRUOG (each letter is shifted by 3). What does it say? Explain how you cracked it!', theme: 'Cipher', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'A farmer has 3 cows, 7 goats, and 4 chickens. How many feet are in the field? Explain your thinking!', theme: 'Logic', timeLimit: 90, category: 'code_cracker', isIndiaThemed: true },
  { text: 'I am a 3-digit number. My tens digit is 5 more than my ones digit. My hundreds digit is 8 less than my tens digit. What am I? Show your reasoning!', theme: 'Number Puzzle', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'You have 8 coins. One is lighter (fake). You have a balance scale. What is the minimum weighings needed to find the fake? Explain!', theme: 'Logic Puzzle', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'If APPLE = 50, BANANA = 42, what does MANGO = ? (A=1, B=2, C=3...) Show your working!', theme: 'Code Puzzle', timeLimit: 90, category: 'code_cracker', isIndiaThemed: true },
  { text: 'Three switches control three bulbs in another room. You can flip switches but only check the room once. How do you figure out which switch controls which bulb?', theme: 'Logic', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'Fill the blank: 16, 06, 68, 88, ?, 98. (Hint: Turn the page upside down!) Explain your thinking!', theme: 'Visual Puzzle', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'In a race, you overtake the person in 2nd place. What place are you in now? Explain your reasoning!', theme: 'Logic Trick', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'How many squares can you count on a standard 8×8 chessboard? (Hint: It\'s not 64!) Explain your approach!', theme: 'Spatial Reasoning', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'SEND + MORE = MONEY. Each letter is a digit 0-9. Can you solve it? Show your steps!', theme: 'Cryptarithmetic', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'A bat and ball together cost ₹110. The bat costs ₹100 more than the ball. How much does the ball cost? Explain why the obvious answer is wrong!', theme: 'Logic Trap', timeLimit: 90, category: 'code_cracker', isIndiaThemed: true },
  { text: 'What comes next: O, T, T, F, F, S, S, ? Explain the pattern!', theme: 'Letter Pattern', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'You have 12 marbles and a balance scale. One marble is a different weight. How do you find it in just 3 weighings? Explain your strategy!', theme: 'Logic Puzzle', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'If 5 machines take 5 minutes to make 5 widgets, how long do 100 machines take to make 100 widgets? Explain your reasoning!', theme: 'Logic', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'Crack the code: 682 (one digit right, wrong place), 614 (one digit right, right place), 206 (two digits right, wrong place). What is the 3-digit code?', theme: 'Code Breaking', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'A snail climbs 3 meters up a wall each day but slides 2 meters down at night. The wall is 10 meters tall. How many days to reach the top? Explain!', theme: 'Logic', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'Decode: 20-8-9-19  9-19  6-21-14 (numbers = letter positions). What does it say? Explain your method!', theme: 'Number Code', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
  { text: 'Two fathers and two sons sit down to eat eggs. They eat exactly three eggs, each person eats one egg. How? Explain!', theme: 'Logic Riddle', timeLimit: 90, category: 'code_cracker', isIndiaThemed: false },
];

// ─── Combined Prompt Pool ───────────────────────────────────

export const ALL_PROMPTS: BeatTheAiPrompt[] = [
  ...STORY_SPRINT_PROMPTS,
  ...RHYME_TIME_PROMPTS,
  ...FACT_OR_BLUFF_PROMPTS,
  ...COMEBACK_KING_PROMPTS,
  ...EXPLAIN_IT_PROMPTS,
  ...DEBATE_CHAMP_PROMPTS,
  ...MATH_WIZARD_PROMPTS,
  ...SCIENCE_DETECTIVE_PROMPTS,
  ...CODE_CRACKER_PROMPTS,
];

const RECENT_KEY_PREFIX = 'gsi-btai-recent-';
const MAX_RECENT = 5;

/** Get a random prompt for a category, avoiding recent repeats */
export function getRandomPrompt(category: BeatTheAiCategory): BeatTheAiPrompt {
  const pool = ALL_PROMPTS.filter((p) => p.category === category);
  if (pool.length === 0) throw new Error(`No prompts for category: ${category}`);

  // Get recent prompt texts to avoid repeats (server-side: skip localStorage)
  let recentTexts: string[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`${RECENT_KEY_PREFIX}${category}`);
      recentTexts = stored ? JSON.parse(stored) : [];
    } catch {
      recentTexts = [];
    }
  }

  // Filter out recent prompts
  const available = pool.filter((p) => !recentTexts.includes(p.text));
  const candidates = available.length > 0 ? available : pool;

  // Pick random (candidates always has at least 1 element since pool is non-empty)
  const picked = candidates[Math.floor(Math.random() * candidates.length)] as BeatTheAiPrompt;

  // Track recent (client-side only)
  if (typeof window !== 'undefined') {
    try {
      const updated = [picked.text, ...recentTexts].slice(0, MAX_RECENT);
      localStorage.setItem(`${RECENT_KEY_PREFIX}${category}`, JSON.stringify(updated));
    } catch {
      // localStorage unavailable, skip
    }
  }

  return picked;
}
