# GSI AI Studio — Product Requirements

## Overview

### Problem Statement
Indian schools face a mandatory AI & Computational Thinking curriculum starting academic year 2026-27 with zero infrastructure, zero trained teachers, and zero student-facing tools — while existing EdTech platforms focus on content delivery and test prep, not AI creation skills.

### Solution
GSI AI Studio is an AI creation + learning platform for Indian kids (ages 8-17) that teaches AI literacy through hands-on creation. Kids build stories, music, quizzes, and games using AI tools while organically learning how AI works — aligned to the CBSE AI & Computational Thinking curriculum. The platform follows a "Learn By Creating" pedagogy: create first, discover the AI behind it.

### Target Market
- **Primary**: Indian school students (Class 3-12) in CBSE/ICSE schools
- **Secondary**: Parents seeking productive screen time for kids
- **Tertiary**: Schools needing 2026-27 AI curriculum compliance tools
- **Geography**: South India initially (leveraging GSI's 100+ school network), expanding pan-India

### Market Timing
India's CBSE mandate (October 2025 announcement) requires AI & CT curriculum from Class 3 onwards starting 2026-27. IIT Madras-led expert committee is designing curriculum. 18,000+ schools already have SOAR modules. Resource materials expected by end of 2025. Schools are actively seeking solutions.

## Personas

### Aarav (Age 10, Class 5)
**Role**: Young Creator
**Goal**: Make cool stuff with AI to show friends and family
**Pain Points**:
- Bored of passive learning apps (watching videos, taking quizzes)
- Wants to create but doesn't know how to code
- Parents limit screen time because apps feel unproductive
**Success Looks Like**: Creates an illustrated storybook in 10 minutes, shares it on WhatsApp, gets compliments from grandparents

### Priya (Age 14, Class 9)
**Role**: Aspiring Tech Explorer
**Goal**: Understand AI and build things that impress
**Pain Points**:
- AI feels abstract and theoretical in textbooks
- No safe sandbox to experiment with AI tools
- Existing platforms are either too childish or too technical
**Success Looks Like**: Builds an AI-powered quiz game, understands how the AI generates questions, adds it to her portfolio

### Meena (Parent)
**Role**: Tech-Aware Parent
**Goal**: Ensure child is AI-literate without harmful screen time
**Pain Points**:
- Worried about kids using ChatGPT unsupervised
- Can't evaluate if a platform is actually educational
- Existing AI tools aren't designed for children (no safety, no learning layer)
**Success Looks Like**: Sees child creating, not just consuming; receives weekly progress showing AI concepts learned

### Ramesh (School Principal / CS Teacher)
**Role**: Curriculum Decision Maker
**Goal**: Comply with 2026-27 CBSE AI mandate without hiring specialists
**Pain Points**:
- No trained AI teachers on staff
- Existing CS curriculum doesn't cover AI/CT
- Budget constraints — can't afford expensive platforms
**Success Looks Like**: Platform provides ready-to-use lesson plans, students create AI projects as assignments, generates compliance reports

## Features

### Core Features (Phase 1 — AI Playground, Weeks 1-4)

#### F1: Story Studio
**User Story**: As a young creator, I want to describe a story idea and have AI write and illustrate it so that I can create a shareable storybook in minutes
**Priority**: P0
**Description**: Text-based story creation where kids provide a premise/characters/setting, Claude generates narrative with illustrations via Replicate (SDXL/Flux). Outputs a shareable storybook with pages. Includes comic mode (panel-by-panel with dialogue bubbles). AI generates age-appropriate, safe content only.
**AI Concepts Taught**: Prompt engineering, natural language generation, text-to-image AI, human-AI collaboration

#### F2: Music Lab
**User Story**: As a kid who loves music, I want to pick a mood and genre and have AI create a song so that I can tweak it and share my creation
**Priority**: P0
**Description**: Kids select mood, genre, and theme → AI generates melody/beats → kids can adjust lyrics, instruments, tempo. Uses Suno/MusicGen API for audio generation. Outputs shareable audio with visual waveform.
**AI Concepts Taught**: Pattern recognition, audio AI, model training concepts, creative AI parameters

#### F3: Quiz & Game Maker
**User Story**: As a student, I want to pick a topic and have AI generate a quiz or game so that I can challenge my friends
**Priority**: P0
**Description**: Kids choose a topic/subject → Claude generates questions, rules, and game mechanics → outputs a playable, shareable quiz or simple game. Supports multiple formats: trivia, true/false, fill-in-the-blank, simple adventure games.
**AI Concepts Taught**: Logic and structured data, AI decision-making, knowledge representation, rule-based systems

#### F4: AI X-Ray (Learning Layer)
**User Story**: As a student learning about AI, I want to see what the AI did behind the scenes so that I understand how it works
**Priority**: P0
**Description**: After every creation, a 30-second "AI X-Ray" popup explains what happened: what model was used, how the prompt was interpreted, what choices the AI made. Maps to CBSE AI & CT curriculum standards. Gamified with "AI Knowledge Points" earned per concept understood.
**AI Concepts Taught**: Meta-learning about AI processes, model types, training data, bias awareness

#### F5: Share & Showcase
**User Story**: As a creator, I want to share my creations via a link so that friends and family can see what I made
**Priority**: P0
**Description**: Every creation gets a unique shareable URL (hosted on Netlify). WhatsApp-optimized share cards with preview image. No login required to view. Includes "Made with GSI AI Studio" branding for organic growth.
**Metrics**: Share rate, view count per creation, viral coefficient

### Phase 1.5 Features (Completed — Enhanced Playground)

- **Game Studio** ✅: Text adventure game creation with branching scenes and choices
- **Comic Studio** ✅: Multi-panel illustrated comics with dialogue bubbles (manga, cartoon, superhero, indie, chibi styles)
- **Download/Export** ✅: PDF export (stories, quizzes), print via hidden iframe, audio download, download tracking
- **Remix/Fork** ✅: Remix any public creation with pre-filled prompts, `remixedFromId` linking
- **My Creations Gallery** ✅: Session-based creation gallery with type filters
- **Explore Feed & Leaderboard** ✅: Public creation feed (trending/newest), top creators leaderboard
- **AI Points & Badges** ✅: Points per creation (10-15), 12 unlockable badges, session-level tracking with Firestore persistence
- **Onboarding Flow** ✅: First-time carousel (Welcome, Create, Learn, Share), stored in localStorage
- **Fun Kid UI + Koko Mascot** ✅: Lottie-animated mascot with 7 expressions, confetti celebrations, Web Audio sound effects
- **Creation Templates & Daily Spark** ✅: 30+ daily sparks per type, template carousel with categories, "Surprise Me!" random selection

### Phase 2 Features (Weeks 5-12 — GSI AI Creators App)

- **User Accounts**: Phone OTP login (Firebase Auth), parent creates account, adds kid profiles
- **Creator Portfolio**: Saved creations, public profile page, badges and streaks
- **Structured Learning Paths**: CBSE-aligned AI curriculum — Beginner (Class 3-5), Intermediate (6-8), Advanced (9-12)
- **Weekly Challenges**: Themed creation challenges with community voting
- **Parent Dashboard**: Progress reports, AI concepts learned, creation activity, screen time
- **Creator Coins**: In-app currency earned through creations and learning milestones

### Phase 3 Features (Months 4-8 — GSI for Schools)

- **Teacher Dashboard**: Class management, assignment creation, progress tracking
- **Lesson Plans**: Pre-built CBSE AI & CT lesson plans mapped to each creation studio
- **Inter-School Competitions**: Monthly competitions leveraging GSI's school network
- **Compliance Reports**: Auto-generated reports showing AI curriculum coverage
- **Offline Mode**: PWA with service workers for schools with poor internet

### Future Features (Post-Phase 3)

- **Indian Language Support**: Tamil, Telugu, Hindi, Kannada creation interfaces
- **App/Chatbot Builder**: Visual block-based builder for ages 13+
- **Video/Animation Studio**: Text-to-animation, AI-narrated explainers
- **Parent + Kid Co-Creation Mode**: Joint creation sessions
- **AI Ethics Scenarios**: Interactive ethical dilemmas through creation

## Success Metrics

| Metric | Phase 1 Target | Measurement |
|--------|----------------|-------------|
| Total Creations | 1,000+ in first month | Firestore creation count |
| Share Rate | 30%+ of creations shared | Share button clicks / total creations |
| Return Visitors | 20%+ weekly return | Analytics unique visitors |
| Avg. Time on Site | 8+ minutes | Analytics session duration |
| School Trials | 5 schools piloting | Manual tracking |
| AI X-Ray Engagement | 50%+ view the popup | Popup view / creation count |

| Metric | Phase 2 Target (Month 6) | Measurement |
|--------|--------------------------|-------------|
| Registered Users | 5,000+ | Firebase Auth count |
| Monthly Active Users | 2,000+ | Monthly unique sessions |
| Paid Conversions | 3-5% of registered | Razorpay transactions |
| Monthly Revenue | ₹84,750 (~$1,000) | Razorpay dashboard |
| Learning Path Completion | 15%+ start a path | Firestore progress tracking |

## Constraints

- **Timeline**: Phase 1 launch target — 4 weeks from development start
- **Budget**: Bootstrap — minimal infrastructure spend, target ₹10-17K/month Phase 1
- **Technical**: Solo developer — architecture must minimize operational overhead
- **Regulatory**: COPPA/India DPDPA considerations for children's data; all AI outputs must be child-safe
- **AI Safety**: All AI-generated content must pass safety filters; no inappropriate content for minors
- **Content**: English only for Phase 1; Indian language support deferred to Phase 2+

## Open Questions

- [ ] Exact CBSE AI & CT curriculum framework details (resource materials expected by end of 2025)
- [x] Music generation API: Resolved — using Google Lyria RealTime (free) → Replicate MusicGen → Mock fallback chain
- [ ] Pricing validation with target parents (₹299/mo resonance testing)
- [ ] Data retention policy for anonymous Phase 1 creations
- [x] WhatsApp sharing: Resolved — using simple WhatsApp Share URL scheme (no Business API needed)
