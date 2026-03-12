# Group Project Foundation Guide

## What this file is for
This is the base file for the whole group, not just for coding.
It gives us one shared direction for:
- the product idea
- the app feeling and style
- the design direction
- the coding standards
- the team workflow
- the next decisions we still need to make together

---

## Project idea
A mobile-first app where friends can decide where to eat together in a simple and fun way.

Core idea:
Users create a session, invite friends, add restaurant ideas, vote or rate options, use filters like price or cuisine, and get one final pick.

This should feel:
- useful
- social
- fast
- clean
- not overdesigned
- real, not like a fake startup demo

---

## Product goal
Build something that solves a real small problem in a way that is easy to demo.

The app should answer one simple question:
**“Where should we eat?”**

Our MVP should focus on making group decisions easier, faster, and less annoying.

---

## Main product pillars

### 1. Easy group decision making
The app should remove back and forth texting and make choosing a place faster.

### 2. Simple social experience
It should feel like something friends would actually use, not a complicated food platform.

### 3. Clean UX
Users should understand how to use it right away without needing instructions.

### 4. Strong demo value
The flow should be easy to show in class: create session, join, add options, vote, get result.

---

## Suggested MVP features

### Must have
- Create a session
- Join a session
- Add restaurant options manually
- Vote or rate restaurants
- Show final winning place
- Basic filters like cuisine, price, distance

### Nice to have
- Map link
- Session code or invite link
- Tie breaker logic
- Restaurant image
- Favorites or save history

### Later / stretch
- Yelp or Google Places API
- AI suggestion helper
- Friend groups
- User accounts
- Recommendation system

---

## Brand and vibe direction
We do **not** want it to look AI generated, too glossy, or too corporate.
We want it to feel natural, modern, and believable.

### Overall feel
- modern
- warm
- social
- slightly urban
- friendly
- simple
- soft, not loud

### Avoid
- super bright neon gradients
- generic AI purple/blue startup colors
- too many shadows
- glassmorphism everywhere
- overly futuristic style
- random animations just to look fancy

---

## Visual direction options
We should pick one direction together.

### Option A: Warm city modern
Feels grounded, clean, social, and realistic.
Good for a food and friends app.

Style words:
- warm neutral base
- dark text
- muted accent colors
- soft corners
- simple cards

### Option B: Minimal euro cafe
Feels a bit more premium and lifestyle-focused.
Less playful, more tasteful.

Style words:
- cream backgrounds
- soft charcoal text
- subtle olive or clay accents
- editorial spacing
- clean layout

### Option C: Night social lounge
Feels more playful and nightlife-focused.
Works if we want the app to feel younger and more energetic.

Style words:
- darker UI base
- warm highlights
- stronger contrast
- modern social vibe

---

## Color direction
We should choose colors together instead of locking them too early.
But here is the rule:

### Color principles
- use grounded colors
- avoid colors that scream “AI app”
- use one main accent, not five
- backgrounds should feel soft, not sterile
- text should have strong readability

### Good color families to explore
- warm white / cream
- charcoal / soft black
- olive
- muted terracotta
- deep navy
- dusty orange
- muted mustard
- stone gray

### Color families to avoid
- bright purple + cyan startup combo
- extreme gradients
- too much electric blue
- random pastel overload

### Decision section
Chosen direction: Option A: Warm city modern
Primary color: #c96e4b
Secondary color: #6e7c63
Background color: #f6f1e8
Text color: #1f1d1a
Accent color: #6e7c63

---

## Typography direction
We want something clean and believable.

### Good style
- simple sans serif
- readable
- slightly modern
- not overly futuristic

### General type feel
- strong headings
- clean body text
- enough spacing
- not tiny

---

## UI style rules
- rounded corners but not too round
- spacing should feel open
- cards should be simple
- one main CTA style
- keep forms short
- icons should be minimal
- no clutter

### Components we will probably need
- buttons
- cards
- filter chips
- restaurant item rows
- voting UI
- session join input
- result screen
- nav bar / bottom nav

---

## Tech direction
Since this is an app idea, our stack should be realistic for a group project.

### Suggested stack
- **Frontend:** React Native with Expo
- **Backend:** Node.js / Express or Supabase
- **Database:** Supabase Postgres or MongoDB Atlas
- **Auth:** Supabase Auth or simple session system for MVP
- **Maps:** Google Maps link first, API later if needed
- **Version control:** GitHub
- **Project management:** Notion
- **Team communication:** Discord

### Best simple path
If we want faster development and less backend setup, Supabase is probably the easiest.
If we want more custom backend practice, Node + Express is stronger.

---

## Coding rules for the group
We should agree on this early.

### General coding rules
- keep code readable
- use clear names
- do not make files messy
- avoid huge components
- comment only when needed
- keep styling consistent
- no random last minute hacks without telling the group

### Git / workflow rules
- never push broken code to main
- use branches for features
- write clear commit messages
- open pull requests for bigger changes
- pull before starting work
- keep everyone updated on what they are changing

### Suggested branch naming
- feature/login-flow
- feature/session-creation
- feature/voting-ui
- fix/join-code-bug
- chore/setup-routing

---

## Team roles
These do not need to be rigid, but it helps to split focus.

### Suggested role areas
- product / feature planning
- frontend UI
- backend / database
- design / styling
- testing / bug checking
- documentation / presentation

### Team decisions to fill in
Product lead: ________
Frontend lead: ________
Backend lead: ________
Design lead: ________
Docs / presentation lead: ________

---

## Sprint 1 focus
The first sprint should be about getting the base working.

### Sprint 1 goals
- finalize app idea and MVP
- finalize stack
- create repo and branch rules
- setup app project
- create wireframe
- build first screens
- create database structure
- decide session flow

---

## Basic user flow
1. User opens app
2. User creates or joins a food session
3. Friends add restaurant ideas
4. Everyone votes or rates
5. Filters are applied if needed
6. App shows final winner
7. Users open map link and go eat

---

## Demo story
For class, the demo should be very easy to understand.

### Demo path
- create a session
- second user joins
- both add restaurant ideas
- both vote
- app shows winner
- open location / final decision

That is enough for a strong MVP demo.

---

## Open decisions we still need to make together
- exact app name (locked: PlateVote)
- final stack choice
- color palette
- logo style
- do we want login in MVP or not
- do we use manual restaurant entry only at first
- how do we break ties
- do we focus more on friends or general users

---

## Recommended next step
As a group, decide these 4 things first:

1. final MVP
2. final stack
3. final visual direction
4. task split

Once that is done, the whole project gets way easier.

---

## Quick decision board

### 1. App name ideas
- PlateVote
- PickPlate
- DineDecide
- VoteBite
- TablePick
- Where2Eat

Chosen name: PlateVote

### 2. Design direction
- Option A: Warm city modern
- Option B: Minimal euro cafe
- Option C: Night social lounge

Chosen direction: Option A: Warm city modern

### 3. Stack
- Expo + Supabase
- Expo + Node/Express + DB

Chosen stack: ________

### 4. MVP scope
Chosen MVP features:
- ________
- ________
- ________
- ________

---

## Locked brand palette for PlateVote

### Final chosen direction
Option A: Warm city modern

### Why this direction fits
- friendly
- food focused
- social
- easy to demo
- not too startup fake

### Final brand colors
- Primary: `#c96e4b`
- Secondary: `#6e7c63`
- Background: `#f6f1e8`
- Card: `#fff9f2`
- Text: `#1f1d1a`
- Muted text: `#5e5a55`
- Border: `#ddd3c7`

### Theme tokens
```css
:root {
  --card: #fff9f2;
  --ring: #c96e4b;
  --input: #ddd3c7;
  --muted: #eee6da;
  --accent: #6e7c63;
  --border: #ddd3c7;
  --radius: 0.75rem;
  --chart-1: #c96e4b;
  --chart-2: #6e7c63;
  --chart-3: #d9a441;
  --chart-4: #b85c38;
  --chart-5: #8c9a7a;
  --popover: #fff9f2;
  --primary: #c96e4b;
  --sidebar: #f3ede4;
  --font-mono: "Roboto Mono", monospace;
  --font-sans: "Poppins", sans-serif;
  --secondary: #6e7c63;
  --background: #f6f1e8;
  --foreground: #1f1d1a;
  --destructive: #b83b3b;
  --sidebar-ring: #c96e4b;
  --sidebar-accent: #e9dfd0;
  --sidebar-border: #ddd3c7;
  --card-foreground: #1f1d1a;
  --sidebar-primary: #c96e4b;
  --muted-foreground: #5e5a55;
  --accent-foreground: #fdfaf6;
  --popover-foreground: #1f1d1a;
  --primary-foreground: #fffaf5;
  --sidebar-foreground: #2a2723;
  --secondary-foreground: #fdfaf6;
  --destructive-foreground: #ffffff;
  --sidebar-accent-foreground: #2a2723;
  --sidebar-primary-foreground: #fffaf5;
}

.dark {
  --card: #23201c;
  --ring: #d17a52;
  --input: #3a342e;
  --muted: #2d2823;
  --accent: #7f8d73;
  --border: #3a342e;
  --radius: 0.75rem;
  --chart-1: #d17a52;
  --chart-2: #7f8d73;
  --chart-3: #d9a441;
  --chart-4: #b85c38;
  --chart-5: #a2ad8f;
  --popover: #23201c;
  --primary: #d17a52;
  --sidebar: #1b1815;
  --secondary: #7f8d73;
  --background: #181512;
  --foreground: #f3eee8;
  --destructive: #d25555;
  --sidebar-ring: #d17a52;
  --sidebar-accent: #2d2823;
  --sidebar-border: #3a342e;
  --card-foreground: #f3eee8;
  --sidebar-primary: #d17a52;
  --muted-foreground: #b9b0a6;
  --accent-foreground: #fdfaf6;
  --popover-foreground: #f3eee8;
  --primary-foreground: #fffaf5;
  --sidebar-foreground: #f3eee8;
  --secondary-foreground: #fdfaf6;
  --destructive-foreground: #ffffff;
  --sidebar-accent-foreground: #f3eee8;
  --sidebar-primary-foreground: #fffaf5;
}
```

## Final note
This project should feel like a real app people might actually use.
That means our choices should stay simple, consistent, and believable.
We do not need to overbuild it.
We need a clear idea, clean execution, and a strong demo.
