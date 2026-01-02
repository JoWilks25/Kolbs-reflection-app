# Automated Kolb's Reflection Cycle App (Personal MVP)

## TL;DR

The Automated Kolb's Reflection Cycle App provides a **session-centric, Practice Area-based workflow** that strictly aligns every Session to exactly one Practice Area, forming a single, ordered chronological Series per Practice Area. Every new Session is mandatorily linked in sequence to the previous Session of its Practice Area, ensuring unbroken contextual continuity—no subcategories or parallel Series are allowed. Each Session explicitly displays the preceding intention ("What will you try next?"), supporting reflective learning over time. 

Voice-friendly guided prompts drive focused Kolb-based reflections post-session using **multiple high-contrast reflection formats** that users can experiment with and track. The app captures feedback on the reflection process itself to continuously improve prompt effectiveness. All reflections remain private and stored locally on the device.

---

## Definitions

**Practice Area**

A distinct skill, technique, or topic you aim to improve. Every Session must be linked to one and only one Practice Area. Practice Areas are mutually exclusive, and users can only add a new area when they are ready to begin learning or reflecting on a wholly new skillset. There is no support for subcategories or parallel progress tracks within a Practice Area.

**Session**

A discrete period of focused practice or application within a single Practice Area. Every Session must be strictly attached to its Practice Area and is chronologically ordered within that area's Series. Except for the first Session in a Practice Area, each Session must be tagged in sequence to the immediately prior Session, forming an unbroken chain—no standalone Sessions.

**Series**

The chronological chain of all Sessions under a particular Practice Area. Each Practice Area contains exactly one Series. This Single Series structure supports clear, linear progression and tracking—no branching, sub-chains, or parallel Series exist within any Practice Area.

---

## Goals

### Business Goals

- Drive at least 3 consecutive reflection Sessions (in sequence within a Practice Area) per user per week in the first month.
- Show >30% reduction in time and effort spent on reflection versus manual journaling, through enforced sequential continuity.
- Demonstrate improved contextual learning and Practice Area progression, based on user-reported experience with linked Series reflections.
- Provide 100% assurance of local data privacy and security.
- Gather actionable feedback on reflection format effectiveness to optimize prompt design and user engagement.

### User Goals

- Enable fast, frictionless Session starts and completions within an existing Practice Area's Series, or when ready, create a new Practice Area to begin a fresh Series.
- Minimize keyboard use; prioritize voice input at all critical stages.
- Always reinforce continuity by surfacing the prior Session's intention at the start of every Session.
- Focus reflection on concise Kolb Steps 2–4 post-session for actionable learning, with **multiple reflection formats** that can be experimented with and tracked.
- Provide feedback on which reflection formats work best, helping improve the reflection experience over time.
- Navigate, review, and visualize full Session chains for each Practice Area, following their singular Series.

### Non-Goals

- No support for collaborative, team, or shared reflection.
- No analytics integrations or cloud-based processing—basic export is manual and local only.
- No support for desktop or legacy-only platforms.

---

## User Stories

**Persona: Individual Learner**

- As a learner, I want to ensure every Session is explicitly linked—by Practice Area and as the next in sequence—to the previous Session, so my progress stays contextual and continuous.

- As a learner, I want to be prevented from starting a new session if I haven't reflected on my previous session, so I maintain consistent reflection discipline and don't lose context.

- As a returning user, at each Session start, I want to see my last "What will you try next?" answer from my previous Session in this Practice Area's Series, enabling directed intent.

- As a reflecting practitioner, I want my post-Session review to cover what actually happened, the lesson or insight gained, and what I will pursue next, locked into an ongoing chain.

- As someone tracking growth in a skill, I want to view and navigate the full, chronological Series of Sessions in each Practice Area, with all intentions and lessons connected—they are never fragmented or standalone.

- As an experimenting learner, I want to try different reflection formats (short, direct, exploratory) and see which ones help me think most clearly and feel most engaging.

- As a user invested in the app's improvement, I want a quick, low-friction way to give feedback on the reflection prompts themselves, so the experience can get better over time.

- As a privacy-driven user, I require secure, device-only storage with effortless voice-based entry at every step.

---

## Functional Requirements

### Session Tagging & Sequential Linking (Mandatory)

- **Exclusive Tagging:** Each Session must be attached to one, and only one, Practice Area.

- **Series-Exclusive Structure:** Each Practice Area contains a single, strictly chronological Series of Sessions. No sub-Series or parallel tracks are allowed within a Practice Area.

- **Sequential Linkage:** Every Session (except the first for a Practice Area) must be explicitly linked as the next in sequence to the prior Session in that Practice Area's Series.

- **Chain Enforcement:** No Sessions may exist outside of this sequential Series model.

### Intent Setup & Continuity

- **Automatic Previous Intent Display:** At Session start, always display the preceding Session's "What will you try next?" answer for the applicable Practice Area.

- **Intent Entry:** Prompt for today's Session intent, with a clear option to reuse or build upon the last intent—ensuring continuity along the Series.

- **Context Visibility:** Past intentions and actions are always reviewable in order during Session setup and reflection.

### Session Flow & Structured Reflection (Kolb Steps 2–4)

Post-session reflection is structured into three clear phases:

1. **Select reflection format** (choose from high-contrast prompt sets)
2. **Answer Kolb Steps 2–4** using the chosen format
3. **Provide quick feedback on the reflection task itself**

#### Phase 1: Choose Your Reflection Format

After ending a Session and before beginning the reflection prompts, users select one of several **high-contrast reflection formats**. Each format offers a different tone, depth, and time commitment, allowing users to match the reflection style to their energy level, session complexity, and learning goals.

**Available Reflection Formats:**

**Set A: Direct & Action-Oriented**

Best for: Quick, focused sessions where the goal is to capture core learning and next steps efficiently.

1. **What actually happened?**  
   Describe the key events, actions, and outcomes in a few sentences.

2. **What's the main lesson or pattern?**  
   What did you learn, or what repeated pattern did you notice? One clear insight is enough.

3. **What will you try/do differently next time?**  
   Name one concrete action or adjustment for the next session.

---

**Set B: Reflective & Exploratory**

Best for: Sessions where deeper insight is desired—after challenging, emotionally charged, or breakthrough moments in practice.

1. **What happened, and what stood out?**  
   Describe the experience and highlight what felt most significant, surprising, or difficult.

2. **What insight, pattern, or assumption did you notice?**  
   What did this reveal about your approach, mindset, or the skill itself? Feel free to explore multiple angles.

3. **What will you experiment with next time?**  
   What small change or new approach will you test in the next session?

---

**Set C: Minimalist / Rapid**

Best for: Very short sessions or low-energy moments; designed to be completed in under 1 minute.

1. **Key event**  
   One sentence on what actually happened.

2. **Main takeaway**  
   One sentence on the lesson or pattern.

3. **Next micro-action**  
   One sentence on what to try next time.

---

### Phase 1: Select Coaching Tone & Enable AI (Optional)

After ending a session, users select a **coaching tone** that determines how the AI (if enabled) will guide their reflection. Users also decide whether to enable AI assistance for this specific reflection.

**Available Coaching Tones**

**Facilitative**  
Uses guided discovery to help users explore their own beliefs and emotions. Employs clarifying questions, examines thought patterns, and helps users draw their own conclusions. Best for self-directed learners who want space to think.

**Socratic**  
Employs structured questioning to build critical thinking systematically. Probes assumptions, examines evidence, and explores implications. Best for users who want rigorous analysis and pattern identification.

**Supportive**  
Provides emotional scaffolding through encouragement, normalizing struggle, and empathy. Offers specific assistance when needed. Best for challenging sessions or when motivation is low.

**AI Toggle Behavior**

Per-session decision:
- **AI ON**: Generates context-aware placeholder starters and adaptive follow-up questions based on Practice Area, intent, previous session's "What will you try next?", and the user's current answers
- **AI OFF**: Shows tone-adapted base prompts only; no placeholders or follow-ups

**Tone Selection UI**

Three cards (similar to v1.0 format selection):

**Card 1: Facilitative – Guided Discovery**
- Icon: 🧭
- Description: "Explore your own insights through open questions"
- Best for: Self-directed reflection

**Card 2: Socratic – Structured Inquiry**  
- Icon: 🔍
- Description: "Challenge assumptions with purposeful questioning"
- Best for: Deep analysis and pattern-spotting

**Card 3: Supportive – Encouraging**
- Icon: 💪
- Description: "Build confidence with empathy and encouragement"
- Best for: Tough sessions or low energy

Below cards: **Toggle switch: "Enable AI coaching for this reflection"** (default: OFF)

***

**Format Selection Behavior:**

- Users select their preferred format via a simple, clearly labeled picker before answering any reflection prompts.
- The chosen format is recorded with the Session and visible in the Series dashboard, allowing users to later compare which formats they gravitate toward and which lead to more valuable reflections.

#### Phase 2: Complete Kolb Steps 2–4 Prompts

Once a format is selected, users proceed stepwise through the three Kolb reflection prompts specific to that format.

**Reflection Prompt Behavior (All Formats):**

- Voice input is encouraged as the primary method; typing is always available as a quick fallback.
- Prompts are presented one at a time, in order.
- Autosave is continuous throughout—users can pause and resume at any time.
- All three prompts must be completed for the reflection to be marked as "complete."
- Previous Sessions' intentions and actions from the Series are visible for reference during reflection, allowing users to see the development of their learning over time.

#### Phase 3: Feedback on the Reflection Task

After completing the Kolb prompts, users are asked to provide quick feedback on **the reflection process itself**—not the practice session, but how the reflection prompts and format worked for them.

**"How did this reflection feel?"**  
(How did you find the reflection task itself?)

Users select one emoji-based rating:

- 😞 **Hard / Frustrating**  
  (Too long, hard to answer, felt forced)

- 😐 **Neutral / Meh**  
  (Fine, but not engaging; just got it done)

- 🙂 **Good / Helpful**  
  (Felt useful, clear, and worth the time)

- 🚀 **Great / Energizing**  
  (Insightful, flowed well, left me feeling clear)

- (Optional) 😕 **Confusing / Unclear**  
  (Prompts were hard to understand or didn't make sense)

**Optional: Add a note about this reflection**

Below the emoji selector, users can optionally expand a text field to add more detail:

- "What made this reflection feel this way?"
- Example prompts: "e.g., prompts were too long/short, unclear wording, felt rushed, had a breakthrough, just right, etc."

This note is entirely optional and collapsed by default, keeping the flow low-friction for most sessions while allowing users to add context when useful.

**Why Capture Reflection Feedback?**

This feedback allows the app (and you, as the designer) to:

- Understand which reflection formats are most effective for different users and contexts.
- Identify friction points in prompt wording or structure.
- Spot patterns, such as whether shorter formats lead to better engagement or if exploratory prompts produce more valuable insights.
- Continuously improve the reflection experience based on real user sentiment.

---

### Session Chain Navigation & Practice Area Review

**Review Dashboard**

For every Practice Area, the app displays the entire chronological Series in a clean, navigable timeline.

**Sort Options:**
- Users can toggle between "Newest first" (default) and "Oldest first" views
- Sort preference applies to current session only (not persisted)

Each Session shows:

- Date and time
- Session intent ("What will you try next?" from the previous Session, and today's intent)
- Reflection format used (Direct, Reflective, or Minimalist)
- Full Kolb Steps 2–4 responses
- Reflection feedback (emoji rating and optional note)
- Position in the Series chain

**Sequential Navigation**

Users can step forward and backward through any Series, moving linearly through their learning journey. There is no branching, no parallel chains—just a clear, unbroken progression within each Practice Area.

**Filters & Viewing Options (Post-MVP)**

The following features are explicitly deferred to post-MVP:
- Filter Sessions by reflection format (e.g., "Show only Reflective & Exploratory sessions")
- Filter by reflection feedback (e.g., "Show sessions where reflection felt Hard/Frustrating" to identify friction patterns)
- Synthesis & Trends view with charts and analytics

MVP includes:
- Sort toggle (Newest first / Oldest first)
- Compact visual indicators (format badges, emoji icons for reflection feedback) in the Session list for at-a-glance scanning

**Synthesis & Trends**

The Series view offers high-level summaries per Practice Area:

- Visual timeline of intent and lesson progression
- Distribution of reflection formats used (e.g., "You used Minimalist format 60% of the time this month")
- Reflection feedback trends (e.g., "Reflective format received more 'Energizing' ratings than Direct")
- Patterns in learning over time, such as recurring insights or evolving goals

---

## User Experience

### Practice Area Selection & Series Initiation

- On launch, users are prompted to select an existing Practice Area (immediately linking them to that area's ongoing Series) or create a new Practice Area (starting a new Series).

- When adding a new Practice Area, users confirm they are ready to start fresh on a distinct skill—no subcategories, no concurrent Series, and no splitting within an existing Practice Area.

- Every Session is always displayed within the clear context of its Practice Area's chronological Series.

### Session Intent Setup (Pre-Session)

- After selecting a Practice Area, the app displays the "What will you try next?" response from the previous Session in the Series—this becomes the starting point for today's intent.

- User is prompted: "What is your intent or micro-goal for today?"  
  (Optionally pre-filled with or building upon the last intent for continuity.)

- The Session is automatically and mandatorily linked to the immediately prior Session in the Practice Area's Series.

### During the Session

- The interface shows a prominent timer and current intent at all times.

- Practice Area and Series context is fixed—mid-Session changes to Practice Area or Series are not supported.

- No interruptions or additional inputs required during active practice.

### Post-Session Reflection (Complete Flow)

**Step 1: Choose reflection format**

- Select from Direct & Action-Oriented, Reflective & Exploratory, or Minimalist / Rapid.

**Step 2: Answer Kolb Steps 2–4**

- Three stepwise prompts, tailored to the chosen format.
- Voice-first input with typing as fallback.
- Autosave throughout; users can pause and resume.

**Step 3: Rate the reflection task**

- Quick emoji-based feedback on the reflection experience.
- Optional text note for additional detail (collapsed by default).

### Session Review, Navigation & Synthesis

- **Series Dashboard:** Every Practice Area entry points to a single, strict timeline of Sessions—displaying date/time, intent, reflection responses, format used, and reflection feedback.

- **Forward/Backward Navigation:** Users move linearly through Sessions; no branching or jumping outside the sequential order.

- **Synthesis View:** Shows summary of intent and lesson progression, reflection format usage, and feedback trends for the Practice Area.

### Streamlined Input & Accessibility

- Large voice capture buttons at each prompt; typing quickly accessible.

- Progress markers at all stages; distraction-free and privacy-indicated interface.

- Designed for one-handed use and meets accessibility standards (WCAG AA, screen readers).

- Minimal taps required:
  - One tap to select reflection format.
  - Three short voice/typed responses for Kolb prompts.
  - One tap for reflection feedback emoji (note optional).

---

## Narrative

After practicing piano, you select "Piano: Hands Independence"—your current Practice Area. The app instantly shows last Session's "What will you try next?" ("Practice left-hand-only accents"), prompting you to describe today's intent ("Increase tempo with left-hand accents"). 

You begin practicing. When finished, you choose the **Direct & Action-Oriented** reflection format and use three quick voice-driven prompts to describe what happened, note your insight, and commit to a refined next action ("Use metronome to focus on tempo stability"). 

Finally, you tap the 🙂 **Good / Helpful** emoji to rate the reflection task—it felt clear and worth the time. This Session is added in sequence to your Practice Area's single Series—always visible and linked for context, review, and continuity as you deepen your skills.

---

## Success Metrics

### User-Centric Metrics

- Repeat engagement: 3+ consecutive reflection Sessions per user per week in the first month.
- Session chain completeness: No unlinked or orphaned Sessions.
- Reflection completion rate: Percentage of Sessions with fully completed Kolb Steps 2–4 and reflection feedback.
- Format usage distribution: Which reflection formats are most/least popular?
- Reflection feedback sentiment: Distribution of emoji ratings across formats and over time.

### Product & Learning Metrics

- Time spent per reflection by format (target: <2 minutes for Minimalist, ~5 minutes for Reflective).
- User-reported reduction in reflection effort vs. manual journaling (target: >30%).
- Repeat review of Practice Area Series timelines (indicator of value and engagement).
- Qualitative themes from optional reflection feedback notes (e.g., "prompts too long," "felt insightful").

### Technical & Privacy Metrics

- Session autosave reliability.
- Privacy audit success (100% local storage, no data leakage).
- Voice input usage vs. typing at each prompt.

---

## Technical Considerations

### Platform & Architecture

- Mobile-first, responsive UI enforcing a stepwise, sequential Practice Area → Session Series structure.
- On-device, privacy-first voice-to-text input using OS-native APIs (iOS/Android).
- Strong, unbreakable tagging/linkage ensuring every Session exists only as the next step in a Practice Area's Series.
- Local, encrypted storage with autosave and resume capability.
- Device authentication via PIN or biometric only.

### Privacy & Security

- All user data stored locally on device, encrypted at rest.
- No cloud sync, no server, no external data dependencies.
- Manual export/backup only (plaintext or encrypted), with strong privacy messaging.
- Privacy status consistently communicated to user throughout the app.

### Storage Management

- Automatic cleanup of orphaned reflection drafts (completed sessions, deleted sessions, >48h old)
- Manual cleanup utility in Settings for user control

### Scalability & Performance

- Designed to support high-frequency usage and rapid sequential Session entry.
- Fast Series navigation and retrieval, even with extensive Session histories.

### Potential Challenges

- Safeguarding against orphaned or unlinked Sessions—every Session must be the next in the Series.
- Seamless, reliable voice input across various user environments (background noise, accents, etc.).
- User-friendly enforcement of a single Series model—avoiding confusion about branching, tagging, or subcategories.
- Bulletproof device-level privacy enforcement.

---

## Milestones & Sequencing

### Project Estimate

**Small:** 1–2 weeks for a lean yet robust session-centric MVP (individual use).

### Team Size & Composition

**Extra-small:** 1 cross-functional engineer/designer, with ~1 week dedicated to QA and user feedback.

### Suggested Phases

**Phase 1: MVP Build & Internal Testing (1 week)**

Deliver:
- Strict Practice Area creation and enforced single Series linking.
- Sequential Session tagging and review.
- Multiple reflection formats (Direct, Reflective, Minimalist) with format selection.
- Kolb Steps 2–4 prompt flow with voice/text input.
- Reflection feedback capture (emoji + optional note).
- Secure local storage with autosave.

**Phase 2: Polish & QA (2–4 days)**

Focus:
- Consistent prompts and microcopy across all reflection formats.
- Robust autosave and resume functionality.
- Rigid enforcement of Series-only model (no orphaned Sessions).
- Series navigation with filters (by format, by reflection feedback).
- Export/backup functionality.

**Phase 3: Iteration & User Habit Analysis (ongoing)**

Monitor:
- Session linkage and Series usage patterns.
- Distribution of reflection formats (which are most/least used?).
- Reflection feedback sentiment by format.
- Friction points or confusion with linking model, prompts, or flow.
- Repeated engagement and privacy feature usage.

Iterate:
- Refine prompt wording based on user feedback.
- Adjust default format or order of formats based on usage.
- Reduce UI friction based on observed pain points.
- Optimize for usability and clarity.

---

## Appendix: Reflection Format Design Rationale

**Why high-contrast formats?**

Users have different needs depending on session complexity, available time, and energy level. Offering clearly differentiated formats (short vs. deep, action-focused vs. insight-focused) allows users to match the reflection tool to the moment, rather than forcing a one-size-fits-all approach.

**Why track which format is used?**

By recording the format per Session, users can later identify patterns: "Do I learn more from exploratory reflections?" or "Am I avoiding the Minimalist format even when I'm tired?" This data also informs product iteration, showing which formats drive engagement and completion.

**Why capture reflection feedback separately from session content?**

The goal is to improve the reflection tool itself. Feedback on the reflection task (e.g., "prompts felt too long" or "this format was energizing") is distinct from feedback on the practice session (e.g., "I struggled with tempo"). By keeping these separate, we can optimize prompt design without conflating it with the user's practice outcomes.
