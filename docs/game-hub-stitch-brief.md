# Game Hub — Screen Requirements (Stitch Brief)

> A content & feature brief for the home screen. Intentionally contains **no layout, positioning, color, or styling instructions** — the design tool should decide structure and style on its own.

---

## 1. What this screen is

The **home screen** of GSI AI Studio — an AI creation + learning platform for kids aged 8–17 (India, CBSE-aligned). It is the first thing a child sees when they open the app. It is not a dashboard or a marketing page; it is a **lobby** — the place a kid lands, sees their progress, and launches into a creative activity.

## 2. What we are trying to achieve

- Make a child **instantly want to start creating**. The screen should feel like opening a game, not a study tool.
- Communicate **progress and momentum** (level, points, streak, achievements) so the child feels rewarded for returning.
- Provide **one-tap access** to every creative studio and activity.
- Feel **alive and social** (friends, rankings, daily goals) without being overwhelming for an 8-year-old.
- Work as a **complete, self-contained screen on a phone with no scrolling**, and also work well on a large desktop screen. The child should never feel lost or have to hunt for things.

## 3. Target users

- Primary: children aged 8–17 creating stories, music, games, etc. with AI.
- They are often on low-end Android phones; the experience must stay simple and fast.
- Reading level and attention span vary widely — clarity and visual cues matter more than dense text.

## 4. Tone & personality

Playful, encouraging, game-like, friendly. There is a mascot character (a cat named "Koko") that represents the app's personality and can appear as a guide/companion. Avoid anything that feels corporate, clinical, or like homework.

---

## 5. Content & components to include

### A. Player identity
- Child's avatar (an emoji or picture)
- Child's name
- A "title" or rank label that changes as they progress (e.g. Apprentice → Rising Star → Creator Pro → Story Wizard → AI Master)
- Current level number
- Experience progress toward the next level (current XP, XP needed for next level, and how much remains)
- Total points / currency (called "AI Points")

### B. Creative studios (the core actions — 9 total)
Each studio is a launch tile the child taps to start that activity. Each has a name, a one-line description, and an icon/visual identity. Some carry a status flag.

1. **Book Studio** — "Write your own books" — flagged **NEW**
2. **Story Studio** — "Magical tales"
3. **Music Lab** — "Compose tracks"
4. **Game Studio** — "Build games"
5. **Comic Studio** — "Draw heroes"
6. **Quiz Maker** — "Test friends"
7. **Beat the AI** — "Challenge mode" — flagged **LIVE**
8. **MindX Arena** — "Skill challenges"
9. **Kid CEO** — "Run your company"

### C. Continue / resume
- A way to jump straight back into the child's most recent unfinished creation, shown by name (e.g. "Resume: Dragon Story").

### D. Achievements / badges
- A collection of badges the child can earn.
- Show which are **earned** vs **locked**.
- Show a count of earned vs total (e.g. 4 of 12).
- Way to view the full badge collection.

### E. Daily quests
- A short list of daily challenges (about 4).
- Each quest has: a title, a reward amount (points/XP), and a state — **completed**, **in progress** (with progress like "2 of 3"), or **locked**.
- Show overall daily progress (e.g. 2 of 4 done, points earned so far).
- Show a bonus condition (e.g. extra reward if all are completed).
- Show when quests reset (a countdown/time).

### F. Leaderboard / ranking
- A weekly ranking of players.
- Top performers (at least the top 3) with name, avatar, and score.
- The child's **own rank** clearly indicated, including their position number and recent movement (e.g. "up 3 this week").
- Indicate it is live/current and when it resets.

### G. Friends / squad
- A list of the child's friends.
- For each: avatar, name, online/offline status, what they're currently doing (e.g. "In Music Lab"), and their level.
- A way to add a friend.
- A count of how many friends are currently online.

### H. Status & utility
- A current **streak** indicator (consecutive days active, e.g. "7 days").
- Access to **settings**.
- App branding/identity (name/logo).

---

## 6. Features & interactions

- Tapping any studio tile starts that activity.
- Tapping "resume" returns to the last in-progress creation.
- Tapping the avatar/profile opens fuller profile/progress detail.
- Tapping a badge area opens the full achievements view.
- Tapping the leaderboard opens the full ranking.
- "Add friend" initiates adding a friend.
- On a phone, the screen should be organized so all of this is reachable **without long scrolling** — it is acceptable to group secondary content (profile detail, full rankings, full quests) into separate sections/views the child can switch between, as long as the main lobby (identity + studios) is the default focus.
- Light, rewarding feedback on interaction (sound/animation cues) is welcome but optional for the design tool to express.

---

## 7. Data each element displays (summary)

| Element | Data points |
|---|---|
| Player | avatar, name, title, level, XP current/needed/remaining, AI Points total |
| Studio tile (×9) | name, short description, icon, optional status flag (NEW / LIVE) |
| Resume | title of last unfinished creation |
| Badge | icon, earned-or-locked state; collection: earned count / total |
| Daily quest | title, reward, state (done/active/locked), progress fraction; group: completed/total, earned points, reset timer, all-complete bonus |
| Leaderboard | rank number, player name, avatar, score; own rank + weekly movement; reset timer; live indicator |
| Friend | avatar, name, online status, current activity, level; plus online count |
| Status | streak days, settings entry point, app name/logo |

---

## 8. Constraints (non-visual)

- Must be usable and complete on a small phone screen **without vertical scrolling of the primary lobby**.
- Must also scale up gracefully to a large desktop screen.
- Audience is children 8–17 — keep language simple, friendly, and encouraging.
- The 9 studios are the most important elements; everything else is supporting context.
- Badge icons shown are placeholders — the design tool may choose its own iconography.

---

*End of brief. The design tool is free to decide all layout, hierarchy, spacing, color, and visual styling.*
