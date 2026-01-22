# Automated Kolb's Reflection Cycle App MVP (v2.0)

**Last updated:** 2026-01-02  
**Version:** 2.0 (AI-Assisted Coaching Redesign)

---

## TLDR

A privacy-first mobile app that enforces sequential, Practice Area-based learning through structured Kolb reflections enhanced with optional AI coaching. Users practice a skill, reflect on what happened using AI-guided prompts tailored to their Practice Area and coaching preference, and build an unbroken Series of improvements over time. All data stays local and encrypted on device.

---

## Definitions

**Practice Area**  
A distinct skill, technique, or topic you aim to improve. Every Session must be linked to one and only one Practice Area. Practice Areas are mutually exclusive, and users can only add a new area when they are ready to begin learning or reflecting on a wholly new skillset. There is no support for subcategories or parallel progress tracks within a Practice Area.

**Session**  
A discrete period of focused practice or application within a single Practice Area. Every Session must be strictly attached to its Practice Area and is chronologically ordered within that area's Series. Except for the first Session in a Practice Area, each Session must be tagged in sequence to the immediately prior Session, forming an unbroken chain—no standalone Sessions.

**Series**  
The chronological chain of all Sessions under a particular Practice Area. Each Practice Area contains exactly one Series. This Single Series structure supports clear, linear progression and tracking—no branching, sub-chains, or parallel Series exist within any Practice Area.

**Coaching Tone (v2.0)**  
The style of AI-assisted guidance users receive during reflection. Three tones available: Facilitative (guided discovery), Socratic (structured inquiry), and Supportive (encouraging scaffolding). Selected per-session and affects how AI generates prompts and follow-up questions.

---

## Goals

### Business Goals

- Drive at least 3+ consecutive reflection Sessions in sequence within a Practice Area per user per week in the first month
- Show >30% reduction in time and effort spent on reflection versus manual journaling, through enforced sequential continuity and AI assistance
- Demonstrate improved contextual learning and Practice Area progression, based on user-reported experience with linked Series reflections
- Provide 100% assurance of local data privacy and security
- Gather actionable feedback on AI coaching effectiveness and tone preferences to optimize prompt design and user engagement

### User Goals

- Enable fast, frictionless Session starts and completions within an existing Practice Area's Series, or when ready, create a new Practice Area to begin a fresh Series
- Minimize keyboard use: prioritize voice input at all critical stages
- Always reinforce continuity by surfacing the prior Session's intention at the start of every Session
- Focus reflection on concise Kolb Steps 2–4 post-session for actionable learning, with optional AI coaching that adapts to Practice Area and preferred style
- Provide feedback on which coaching tones and AI features work best, helping improve the reflection experience over time
- Navigate, review, and visualize full Session chains for each Practice Area, following their singular Series

### Non-Goals

- No support for collaborative, team, or shared reflection
- No analytics integrations or cloud-based processing—basic export is manual and local only
- No support for desktop or legacy-only platforms
- No therapy-grade mental health support—focus is skill improvement coaching

---

## AI-Assisted Reflection Design (v2.0 Redesign)

### What Changed from v1.0

Version 1.0 used three fixed reflection formats (Direct, Reflective, Minimalist) with different question wordings and depth levels. Users selected a format based on time available and session complexity.

Version 2.0 redesigns this approach using **AI-assisted coaching tones** that adapt to the user's Practice Area, intent, and answers in real-time.

### v1.0 vs v2.0 Comparison

| Aspect | v1.0 (Fixed Formats) | v2.0 (AI-Assisted Coaching Tones) |
|---|---|---|
| **User selects** | Format based on depth/length (Direct/Reflective/Minimalist) | Coaching tone based on preferred style (Facilitative/Socratic/Supportive) |
| **Question structure** | Different wording per format, static | Single 3-step Kolb structure, dynamic adaptation |
| **Personalization** | None — same questions for all Practice Areas | AI generates context-aware questions and follow-ups based on Practice Area, intent, and previous answers |
| **User control** | Format locked once selected | AI toggle: users can enable/disable AI per session |
| **Without AI** | N/A (no AI in v1.0) | Tone affects base prompt wording only, no adaptive follow-ups |
| **With AI** | N/A | Tone shapes AI's generated questions, follow-up questions, and probing style |

### Why This Redesign?

- Reduces cognitive overhead: users choose **how they want to be coached**, not **how long to spend**
- Increases relevance: AI tailors questions to specific Practice Area types (solo skill vs. interpersonal vs. creative)
- Maintains simplicity: still 3 steps, voice-first, fast completion
- Preserves user agency: AI suggestions are never auto-saved; users control final content
- Privacy-first: all AI processing happens on-device with no cloud dependencies

---

## User Stories

**Persona: Individual Learner**

- As a learner, I want to ensure every Session is explicitly linked—by Practice Area and as the next in sequence—to the previous Session, so my progress stays contextual and continuous
- As a returning user, at each Session start, I want to see my last "What will you try next?" answer from my previous Session in this Practice Area's Series, enabling directed intent
- As a reflecting practitioner, I want my post-Session review to cover what actually happened, the lesson or insight gained, and what I will pursue next, locked into an ongoing chain
- As someone tracking growth in a skill, I want to view and navigate the full, chronological Series of Sessions in each Practice Area, with all intentions and lessons connected—they are never fragmented or standalone
- **As a user who finds blank prompts difficult, I want AI-generated questions tailored to my Practice Area and intent, so I can begin reflecting without friction**
- **As a reflective learner, I want to choose a coaching tone that matches my current needs (exploratory vs. structured vs. supportive), so the reflection process feels appropriate for each session**
- **As a privacy-conscious user, I want AI coaching to run entirely on my device with no cloud dependencies, so my reflections remain completely private**
- As a user invested in the app's improvement, I want a quick, low-friction way to give feedback on the reflection coaching itself, so the experience can get better over time
- As a user with a pending reflection, I want to be prevented from starting a new session until I complete or delete the previous one, so I maintain reflection discipline and learning continuity (see Implementation Notes §1)
- As a user reviewing my Series timeline, I want to toggle between newest-first and oldest-first sorting, so I can quickly review recent work or trace my learning progression chronologically (see Implementation Notes §2)
- As a privacy-conscious user, I want automatic cleanup of orphaned reflection drafts, so sensitive data doesn't accumulate unnecessarily in storage (see Implementation Notes §3)
- As a user switching between preview builds or devices, I want to export and import my data as JSON, so I can preserve my Practice Areas, Sessions, and Reflections across app installations (see Implementation Notes §4 - JSON Import Feature)

---

## Functional Requirements

### Session Tagging & Sequential Linking (Mandatory)

- **Exclusive Tagging**: Each Session must be attached to one, and only one, Practice Area
- **Series-Exclusive Structure**: Each Practice Area contains a single, strictly chronological Series of Sessions. No sub-Series or parallel tracks are allowed within a Practice Area
- **Sequential Linkage**: Every Session (except the first for a Practice Area) must be explicitly linked as the next in sequence to the prior Session in that Practice Area's Series
- **Chain Enforcement**: No Sessions may exist outside of this sequential Series model

### Intent Setup & Continuity

- **Automatic Previous Intent Display**: At Session start, always display the preceding Session's "What will you try next?" answer for the applicable Practice Area
- **Intent Entry**: Prompt for today's Session intent, with a clear option to reuse or build upon the last intent—ensuring continuity along the Series
- **Context Visibility**: Past intentions and actions are always reviewable in order during Session setup and reflection

### Session Flow & Structured Reflection (Kolb Steps 2–4)

Post-session reflection is structured into three clear phases:

1. **Select coaching tone & enable AI (optional)** — choose how you want to be coached
2. **Answer Kolb Steps 2–4** — using tone-adapted prompts, with optional AI placeholders and follow-ups
3. **Provide quick feedback** on the reflection coaching experience

---

## Session Flow: Detailed Breakdown

### Phase 1: Select Coaching Tone & Enable AI (Optional)

After ending a session, users select a **coaching tone** that determines how the AI (if enabled) will guide their reflection. Users also decide whether to enable AI assistance for this specific reflection.

#### Available Coaching Tones

**Facilitative – Guided Discovery**  
Uses guided discovery to help users explore their own beliefs and emotions. Employs clarifying questions, examines thought patterns, and helps users draw their own conclusions. Best for self-directed learners who want space to think.

**Socratic – Structured Inquiry**  
Employs structured questioning to build critical thinking systematically. Probes assumptions, examines evidence, and explores implications. Best for users who want rigorous analysis and pattern identification.

**Supportive – Encouraging**  
Provides emotional scaffolding through encouragement, normalizing struggle, and empathy. Offers specific assistance when needed. Best for challenging sessions or when motivation is low.

#### AI Toggle Behavior

Per-session decision:
- **AI ON**: Generates context-aware questions and adaptive follow-up questions based on Practice Area, intent, previous session's "What will you try next?", and the user's current answers
- **AI OFF**: Shows tone-adapted base prompts only; no AI-generated questions or follow-ups

#### Tone Selection UI

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

---

### Phase 2: Complete Kolb Steps 2–4 Prompts

#### Base Kolb Structure (All Tones)

All reflections follow the same 3-step structure:
1. **Step 2**: What happened?
2. **Step 3**: What did you learn or notice?
3. **Step 4**: What will you do next?

#### How Coaching Tones Modify Base Prompts

The selected tone adjusts the wording and framing of each step:

| Kolb Step | Facilitative | Socratic | Supportive |
|---|---|---|---|
| **Step 2: What happened?** | "What happened during this practice? Which moments stood out to you most?" | "What actually happened, step by step? What was different from what you expected?" | "What happened in this session? What parts felt most challenging or successful?" |
| **Step 3: What did you learn?** | "What are you noticing about yourself or your approach?" | "Looking back, what worked and what didn't? What patterns are you seeing?" | "What's the main thing you're taking away from this? What felt like progress?" |
| **Step 4: What's next?** | "What do you feel ready to explore or try next time?" | "What specific change will you test in your next session?" | "What's one small thing you'll focus on next time?" |

#### AI Enhancements When Enabled

When AI is toggled ON, it provides two types of assistance:

1. **Context-aware step questions** (replaces static prompts):
   - Generated using: Practice Area name, today's intent, previous session's step 4 answer
   - Tailored to the selected coaching tone and Practice Area type
   - Examples: "You set out to practice left-hand independence. Walk me through what you actually did—what steps did you take?"

2. **Adaptive follow-up questions** (max 1–2 per step):
   - Only shown if user's answer is brief (<150 chars) or AI detects opportunity for deeper reflection
   - Tailored by Practice Area type AND coaching tone

#### How AI Adapts by Practice Area Type × Coaching Tone

| Practice Area Type | Facilitative AI Follow-ups | Socratic AI Follow-ups | Supportive AI Follow-ups |
|---|---|---|---|
| **Solo skill practice** (piano, drawing, coding) | "How did you feel during the challenging parts?" | "What assumptions did you have going in that proved incorrect?" | "Which part are you most proud of handling?" |
| **Performance/presentation** (speaking, sports competition) | "How did your internal experience differ from what you think others saw?" | "What thought patterns affected your confidence?" | "What helped you push through the nerves?" |
| **Interpersonal/collaborative** (management, critique, teaching) | "How do you think the other person experienced the interaction?" | "What evidence do you have for your interpretation of their behavior?" | "What felt uncomfortable, and how did you navigate it?" |
| **Creative/exploratory** (writing, improvisation, brainstorming) | "What surprised you about where your ideas went?" | "What constraints or habits shaped your creative choices?" | "What moments felt like you were in flow?" |

#### Reflection Prompt Behavior (All Modes)

- Voice input encouraged as primary method; typing always available as fallback
- Prompts presented one at a time, in order
- Autosave continuous throughout—users can pause and resume anytime
- All three prompts must be completed for reflection to be marked complete
- Previous Sessions' intentions and actions from the Series visible for reference during reflection
- Character limit: 3000 chars per field (~500 words)

---

### Phase 3: Feedback on the Reflection Task

After completing Kolb Steps 2–4, users provide quick feedback on the reflection experience itself.

#### Question Asked

- If AI was ON: **"How did the reflection coaching feel?"**
- If AI was OFF: **"How did this reflection feel?"**

#### 5-Point Emoji Rating (single-select, large tap targets)

- 😖 **Confusing / Unclear** – Prompts were hard to understand or didn't make sense
- 😤 **Hard / Frustrating** – Too long, hard to answer, felt forced
- 😐 **Neutral / Meh** – Fine, but not engaging; just got it done
- 🙂 **Good / Helpful** – Felt useful, clear, and worth the time
- 🤩 **Great / Energizing** – Insightful, flowed well, left me feeling clear

#### Optional Text Note (collapsed by default)

- Label: **"What made this reflection feel this way? (optional)"**
- Placeholder: "e.g., AI questions were spot-on, felt rushed, prompts too long, had a breakthrough, etc."

This note is entirely optional and collapsed by default, keeping the flow low-friction for most sessions while allowing users to add context when useful.

#### Why Capture Reflection Feedback?

This feedback allows the app (and you, as the designer) to:
- Understand which coaching tones are most effective for different users and contexts
- Identify friction points in AI question quality and relevance
- Spot patterns: whether AI follow-ups add value or feel intrusive
- Continuously improve the reflection experience based on real user sentiment
- Compare AI-assisted vs. non-AI reflection satisfaction

#### Reflection Discipline Enforcement

To maintain learning continuity and prevent session accumulation without reflection, the app enforces a **blocking guard**: users cannot start a new session in a Practice Area if their previous session lacks a completed reflection. Users are prompted to either complete the pending reflection or delete the unreflected session. (See Implementation Notes §1 for full rationale and implementation details.)

---

## Session Chain Navigation & Practice Area Review

### Review Dashboard

For every Practice Area, the app displays the entire chronological Series in a clean, navigable timeline.

Each Session shows:
- Date and time
- Session intent ("What will you try next?" from the previous Session, and today's intent)
- Coaching tone used (Facilitative / Socratic / Supportive)
- AI status (AI-assisted or Manual)
- Full Kolb Steps 2–4 responses
- Reflection feedback: emoji rating and optional note
- Position in the Series chain

### Sequential Navigation

Users can step forward and backward through any Series, moving linearly through their learning journey. There is no branching, no parallel chains—just a clear, unbroken progression within each Practice Area. **Users can toggle between newest-first (default) and oldest-first sorting** for flexible navigation. (See Implementation Notes §2)

### Filters & Viewing Options

- Filter Sessions by coaching tone (e.g., "Show only Socratic sessions")
- Filter by AI usage (AI-assisted vs. Manual)
- Filter by reflection feedback (e.g., "Show sessions where reflection felt Hard/Frustrating" to identify friction patterns)
- Use compact visual indicators (F / S / Sup for tone, 🤖 icon for AI-assisted, emoji icons for reflection feedback) in the Session list for at-a-glance scanning

### Synthesis & Trends

The Series view offers high-level summaries per Practice Area:
- Visual timeline of intent and lesson progression
- Distribution of coaching tones used (e.g., "You used Supportive tone 60% of the time this month")
- AI adoption rate and satisfaction trends (e.g., "AI-assisted reflections averaged 4.2/5 rating vs. 3.8/5 for manual")
- Reflection feedback trends (e.g., "Socratic tone received more 'Energizing' ratings than Facilitative")
- Patterns in learning over time, such as recurring insights or evolving goals

---

## User Experience

### Practice Area Selection & Series Initiation

- On launch, users are prompted to select an existing Practice Area (immediately linking them to that area's ongoing Series) or create a new Practice Area (starting a new Series)
- When adding a new Practice Area, users confirm they are ready to start fresh on a distinct skill—no subcategories, no concurrent Series, and no splitting within an existing Practice Area
- Every Session is always displayed within the clear context of its Practice Area's chronological Series

### Session Intent Setup (Pre-Session)

- After selecting a Practice Area, the app displays the "What will you try next?" response from the previous Session in the Series—this becomes the starting point for today's intent
- User is prompted: **"What is your intent or micro-goal for today?"** (Optionally pre-filled with or building upon the last intent for continuity)
- The Session is automatically and mandatorily linked to the immediately prior Session in the Practice Area's Series

### During the Session

- The interface shows a prominent timer and current intent at all times
- Practice Area and Series context is fixed—mid-Session changes to Practice Area or Series are not supported
- No interruptions or additional inputs required during active practice

### Post-Session Reflection (Complete Flow)

**Step 1**: Choose coaching tone & enable AI (optional)
- Select from Facilitative, Socratic, or Supportive
- Toggle AI on or off for this reflection

**Step 2**: Answer Kolb Steps 2–4
- Three stepwise prompts, adapted to the chosen tone
- Voice-first input with typing as fallback
- If AI enabled: see context-aware AI-generated questions and adaptive follow-ups
- Autosave throughout—users can pause and resume

**Step 3**: Rate the reflection coaching
- Quick emoji-based feedback on the coaching experience
- Optional text note for additional detail (collapsed by default)

### Session Review, Navigation & Synthesis

- **Series Dashboard**: Every Practice Area entry points to a single, strict timeline of Sessions—displaying date/time, intent, coaching tone, AI status, reflection responses, and feedback
- **Forward/Backward Navigation**: Users move linearly through Sessions (no branching or jumping outside the sequential order)
- **Synthesis View**: Shows summary of intent and lesson progression, coaching tone distribution, AI usage patterns, and feedback trends for the Practice Area

### Streamlined Input & Accessibility

- Large voice capture buttons at each prompt; typing quickly accessible
- Progress markers at all stages; distraction-free and privacy-indicated interface
- Designed for one-handed use and meets accessibility standards (WCAG AA, screen readers)
- Minimal taps required:
  - One tap to select coaching tone
  - One tap to toggle AI on/off
  - Three short voice/typed responses for Kolb prompts (with optional AI follow-ups)
  - One tap for reflection feedback emoji (note optional)

---

## Narrative

After practicing piano, you select **"Piano: Hands Independence"**—your current Practice Area. The app instantly shows last Session's "What will you try next?" ("Practice left-hand-only accents"), prompting you to describe today's intent ("Increase tempo with left-hand accents").

You begin practicing. When finished, you choose the **Socratic – Structured Inquiry** coaching tone and **toggle AI on** for this reflection.

At Step 2, the AI generates a tailored question: "You set out to practice left-hand independence. Walk me through what you actually did—what steps did you take?" You voice-answer: "Struggled with F major transitions at higher tempo."

Because your answer is brief, the AI asks a follow-up: "What assumptions did you have going in that proved incorrect?" You respond: "I thought I could maintain the slower tempo's precision—turns out I need more finger independence drills."

At Step 3, the AI adapts: "Looking back, what worked and what didn't? What patterns are you seeing?" You answer and move to Step 4, where AI suggests: "What specific change will you test in your next session?" You commit: "Use metronome to focus on tempo stability with left hand only."

Finally, you tap the 🤩 **Great / Energizing** emoji to rate the AI coaching—it felt insightful and relevant.

This Session is added in sequence to your Practice Area's single Series—always visible and linked for context, review, and continuity as you deepen your skills.

---

## Success Metrics

### User-Centric Metrics

- Repeat engagement: 3+ consecutive reflection Sessions per user per week in the first month
- Session chain completeness: No unlinked or orphaned Sessions
- Reflection completion rate: % of Sessions with fully completed Kolb Steps 2–4 and feedback
- **Coaching tone usage distribution**: Which tones are most/least popular?
- **AI adoption rate**: % of sessions with AI enabled
- **Reflection feedback sentiment**: By coaching tone AND by AI-on vs. AI-off

### Product & Learning Metrics

- **Average reflection completion time**: By tone, and AI-on vs. AI-off (target: <5 min with AI, <3 min without)
- **AI follow-up engagement rate**: % of AI-generated follow-ups that users actually answer vs. skip
- User-reported reduction in reflection effort vs. manual journaling (target: >30%)
- Repeat review of Practice Area Series timelines (indicator of value and engagement)
- Qualitative themes from optional reflection feedback notes (e.g., "AI questions felt intrusive", "tone didn't match my mood", "AI questions were helpful")

### Technical & Privacy Metrics

- Session autosave reliability
- **AI response latency**: Time from user request to question/follow-up generation (target: <2 seconds)
- Privacy audit success (100% local storage, no data leakage)
- Voice input usage vs. typing at each prompt

---

## Technical Considerations

### Platform & Architecture

- Mobile-first, responsive UI enforcing a stepwise, sequential Practice Area → Session → Series structure
- On-device, privacy-first voice-to-text input using OS-native APIs (iOS/Android)
- **On-device LLM integration** for real-time AI coaching (question generation, adaptive follow-ups)
- Strong, unbreakable tagging/linkage ensuring every Session exists only as the next step in a Practice Area's Series
- Local, encrypted storage with autosave and resume capability
- Device authentication via PIN or biometric only

#### AI Coaching Requirements

(Detail in Tech Spec):
- Model must handle: Practice Area context, session intent, previous "What will you try next?", current step answers, selected coaching tone
- Must generate responses in <2 seconds for real-time feel
- Must operate fully on-device with no network calls

### Privacy & Security

- All user data stored locally on device, encrypted at rest
- No cloud sync, no server, no external data dependencies
- **Export/Import**: Manual JSON export and import for data backup and restoration across preview builds or devices. Export includes all Practice Areas, Sessions, Reflections, coaching tones, and AI usage flags. Import uses atomic transactions to ensure data integrity. (See Implementation Notes §4 for JSON schema and implementation details.)
- **Storage Management**: Automatic cleanup of orphaned reflection drafts on app launch, plus manual cleanup option in Settings. Removes drafts for completed reflections, deleted sessions, and sessions >48h old. (See Implementation Notes §3 for cleanup criteria.)
- Privacy status consistently communicated to user throughout the app
- **AI processing happens entirely on-device**—no text sent to external servers

### Scalability & Performance

- Designed to support high-frequency usage and rapid sequential Session entry
- Fast Series navigation and retrieval, even with extensive Session histories
- **AI inference optimized for mobile**—model runs efficiently on device without draining battery

### Potential Challenges

- Safeguarding against orphaned or unlinked Sessions—every Session must be the next in the Series
- Seamless, reliable voice input across various user environments (background noise, accents, etc.)
- User-friendly enforcement of a single Series model—avoiding confusion about branching, tagging, or subcategories
- Bulletproof device-level privacy enforcement
- **On-device LLM response quality and latency** for real-time question generation
- **Balancing AI helpfulness with user agency**—avoiding over-coaching or making users feel controlled
- **Storage hygiene and draft management**—ensuring reflection drafts don't accumulate indefinitely while preserving crash recovery benefits

---

## Milestones & Sequencing

### Project Estimate

**Small**: 1.5–2 weeks for a lean yet robust session-centric MVP with AI coaching (individual use).

### Team Size & Composition

**Extra-small**: 1 cross-functional engineer/designer, with ~1 week dedicated to QA and user feedback.

### Suggested Phases

#### Phase 1: MVP Build & Internal Testing (1–1.5 weeks)

**Deliver:**
- Strict Practice Area creation and enforced single Series linking
- Sequential Session tagging and review
- **3 coaching tones (Facilitative, Socratic, Supportive) with tone selection screen**
- **AI toggle per session**
- **AI question generation for Kolb steps 2–4 based on Practice Area, intent, and previous session**
- **Adaptive follow-up questions (max 1–2 per step) based on Practice Area type, tone, and user's answer length**
- Kolb Steps 2–4 prompt flow with voice/text input
- Reflection feedback capture (emoji + optional note)—tracks AI-on vs. AI-off sentiment
- Secure local storage with autosave
- **On-device LLM integration** (e.g., Llama 3.2 3B or similar)
- Blocking guard preventing new sessions with pending reflections
- Sort toggle (newest-first / oldest-first) on Series timeline
- Automatic and manual draft cleanup utility
- JSON export and import for data backup/restoration

#### Phase 2: Polish & QA (2–4 days)

**Focus:**
- Consistent prompts and microcopy across all coaching tones
- Robust autosave and resume functionality
- Rigid enforcement of Series-only model (no orphaned Sessions)
- Series navigation with filters (by tone, by AI-on/off, by reflection feedback)
- **AI response quality testing**: ensure AI-generated questions and follow-ups are relevant and non-intrusive
- **AI latency optimization**: target <2 sec response time
- Export/backup functionality (includes tone and ai_assisted flag in JSON)

#### Phase 3: Iteration & User Habit Analysis (ongoing)

**Monitor:**
- Session linkage and Series usage patterns
- Coaching tone distribution (which are most/least used?)
- AI adoption rate and user satisfaction with AI coaching
- Reflection feedback sentiment by tone and AI status
- Friction points or confusion with linking model, prompts, or AI behavior
- Repeated engagement and privacy feature usage
- Blocking guard impact: Does it improve reflection completion rates or create frustration?
- Sort toggle usage: Which sort order is preferred by users?
- Draft cleanup effectiveness: Storage savings and user awareness
- Export/import usage: Frequency and use cases (preview builds, backups, device switches)

**Iterate:**
- Refine prompt wording and AI follow-up logic based on user feedback
- Adjust coaching tone descriptions or AI behavior based on usage patterns
- Reduce UI friction based on observed pain points
- Optimize AI response quality and relevance
- Balance AI helpfulness with user control

---

## Appendix: Coaching Tone Design Rationale

### Why Three Coaching Tones?

Users have different cognitive and emotional needs depending on session context, energy level, and learning goals. Offering clearly differentiated coaching styles allows users to match the reflection tool to the moment, rather than forcing a one-size-fits-all approach.

### Why Track Which Tone is Used?

By recording the tone per Session, users can later identify patterns: "Do I learn more from Socratic reflections?" or "Do I avoid Supportive even when I'm struggling?" This data also informs product iteration, showing which tones drive engagement and completion.

### Why Capture Reflection Feedback Separately from Session Content?

The goal is to improve the reflection tool itself. Feedback on the coaching experience (e.g., "AI questions felt too probing" or "this tone was energizing") is distinct from feedback on the practice session (e.g., "I struggled with tempo"). By keeping these separate, we can optimize coaching design without conflating it with the user's practice outcomes.

### Why Optional AI?

Not every session needs deep coaching. Some users want speed; others want depth. Giving users control over AI per-session ensures the tool adapts to their needs rather than imposing a fixed experience. It also allows direct comparison of AI-assisted vs. manual reflections to measure value added.

---

## Related Documentation

For detailed implementation notes on v1.0 foundation features (blocking guard, sort toggle, draft cleanup, export/import), see **Implementation-Notes.md** in the `/docs` folder. That document includes full rationale, implementation details, user impact analysis, and alignment with PRD goals.

---

**End of PRD**
