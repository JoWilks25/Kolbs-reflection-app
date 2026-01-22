# Implementation Notes: Enhancements Beyond Original Spec

**Document Version:** 2.0  
**Last Updated:** January 6, 2026  
**Status:** v2.0 AI-Assisted Coaching Redesign

---

## Overview

This document records all implementation enhancements that were added beyond the original PRD and Tech Spec. These enhancements improve user experience, enforce reflection discipline, and provide better storage management while maintaining alignment with the core product vision.

**Note:** As of v2.0, the app has been redesigned to include AI-assisted coaching. See the [v2.0 Redesign Section](#v20-ai-assisted-coaching-redesign) for details on the major architectural changes.

---

## v2.0 AI-Assisted Coaching Redesign

**Status:** 🔄 In Development  
**Reference:** [Tech Spec v2](Kolbs-Cycle-App-Tech-Spec-v2.md), [PRD v2](Kolbs-Cycle-App-PRD-v2.md)

### What Changed

Version 2.0 introduces a major redesign of the reflection system:

| Aspect | v1.0 | v2.0 |
|--------|------|------|
| **Reflection Selection** | 3 fixed formats (Direct, Reflective, Minimalist) | 3 coaching tones (Facilitative, Socratic, Supportive) |
| **Question Adaptation** | Static questions per format | AI-adapted prompts based on Practice Area type and context |
| **AI Features** | None | On-device LLM for question generation and follow-ups |
| **Practice Area Types** | None | User-selected (solo_skill, performance, interpersonal, creative) |
| **Device Requirements** | iOS 15+ | iOS 26+ for AI features (graceful degradation for older) |

### Key Technical Decisions

1. **On-Device LLM:** `react-native-ai` (@react-native-ai/apple) using Apple Foundation Models
   - Zero bundle size impact
   - 100% on-device processing (privacy-first)
   - Requires iOS 26+ and Apple Intelligence-enabled devices

2. **Practice Area Type Classification:** User-selected dropdown with 4 categories
   - `solo_skill`: Technical practice, measurable progress
   - `performance`: Execution under pressure, audience awareness
   - `interpersonal`: Communication, emotional dynamics
   - `creative`: Exploration, experimentation, non-linear discovery

3. **AI Toggle Default:** ON for supported devices
   - Users can disable AI per-session
   - AI features hidden on unsupported devices

4. **Graceful Degradation:** Full app functionality on all devices
   - Coaching tones work identically with or without AI
   - AI-generated questions and follow-ups only available on iOS 26+ with Apple Intelligence

### Database Schema Changes

```sql
-- practice_areas: Added type column
ALTER TABLE practice_areas ADD COLUMN type TEXT NOT NULL DEFAULT 'solo_skill';

-- reflections: Renamed format → coaching_tone, added AI columns
coaching_tone INTEGER NOT NULL,  -- 1=Facilitative, 2=Socratic, 3=Supportive
ai_assisted INTEGER NOT NULL DEFAULT 1,
ai_questions_shown INTEGER DEFAULT 0,
ai_followups_shown INTEGER DEFAULT 0,
ai_followups_answered INTEGER DEFAULT 0,
```

### Migration from v1.0

- Existing `format` values map directly to `coaching_tone` (1→1, 2→2, 3→3)
- All existing reflections marked as `ai_assisted = 0`
- Practice Areas default to `type = 'solo_skill'` (users can update)

### New Files in v2.0

- `services/aiService.ts` - Apple Foundation Models integration
- `services/promptService.ts` - Prompt building by tone × type
- `hooks/useAICoaching.ts` - React hook for AI features
- `screens/ReflectionToneScreen.tsx` - Renamed from ReflectionFormatScreen

### Updated Screens

| Screen | Changes |
|--------|---------|
| `ReflectionToneScreen` | New coaching tone cards + AI toggle |
| `ReflectionPromptsScreen` | AI-generated questions, follow-ups, tone-adapted prompts |
| `ReflectionFeedbackScreen` | AI-aware question variant |
| `SeriesTimelineScreen` | Tone badges (F/S/Sup) + AI icon |
| `PracticeAreaModal` | Type dropdown added |
| `SettingsScreen` | AI status display |

### Prompt Engineering

Prompts are managed in a separate document (TBD). The prompt system uses:
- System prompts per coaching tone
- Practice Area type modifiers
- Context injection (Practice Area name, intent, previous Step 4)

---

---

## Implemented Enhancements

### 1. Blocking Guard for New Sessions

**Status:** ✅ Implemented  
**Value:** High - Enforces reflection discipline  
**Location:** `screens/HomeScreen.tsx`

#### Description

Prevents users from starting a new session in a Practice Area if their previous session lacks a completed reflection.

#### Implementation

```typescript
const handlePracticeAreaPress = async (practiceAreaId: string) => {
  const blockingSession = await getBlockingUnreflectedSession(practiceAreaId);

  if (blockingSession) {
    Alert.alert(
      'Reflection Pending',
      'You have a pending reflection for your last session. Please complete it or delete the session before starting a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go to Timeline',
          onPress: () => navigation.navigate('SeriesTimeline', {
            practiceAreaId,
            focusSessionId: blockingSession.id,
          }),
        },
      ]
    );
    return;
  }

  navigation.navigate("SessionSetup", { practiceAreaId });
};
```

#### Rationale

- **Aligns with PRD Goals:** Supports the goal of "3+ consecutive reflection Sessions per user per week" by preventing session accumulation without reflection
- **Maintains Context:** Ensures users don't lose the learning context from their previous session
- **Enforces Discipline:** Creates a healthy habit loop: practice → reflect → practice
- **User-Friendly:** Provides clear guidance with option to navigate directly to the pending reflection

#### User Impact

- Positive: Maintains reflection consistency and learning continuity
- Minimal friction: Users can still delete unreflected sessions if needed (e.g., accidental session creation)

---

### 2. Sort Toggle (Newest First / Oldest First)

**Status:** ✅ Implemented  
**Value:** Medium - Improves navigation flexibility  
**Location:** `screens/SeriesTimelineScreen.tsx`

#### Description

Allows users to toggle between viewing sessions in descending order (newest first) or ascending order (oldest first) on the Series Timeline.

#### Implementation

```typescript
const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

const toggleSortOrder = (order: 'asc' | 'desc') => {
  if (order !== sortOrder) {
    setSortOrder(order);
  }
};
```

#### Rationale

- **Flexible Navigation:** Users can review recent sessions quickly (newest first) or trace their learning progression chronologically (oldest first)
- **Common Pattern:** Sort toggles are familiar UI patterns that users expect in timeline/list views
- **Low Complexity:** Simple state management, no persistence needed
- **Complements Sequential Model:** Doesn't conflict with the strict sequential linking model—just changes display order

#### User Impact

- Positive: Improves usability for different review patterns
- Default to "newest first" matches most common use case (reviewing recent work)

---

### 3. Draft Cleanup Utility

**Status:** ✅ Implemented  
**Value:** Medium - Storage management & user control  
**Location:** `screens/SettingsScreen.tsx`, `utils/draftCleanup.ts`

#### Description

Provides both automatic (on app launch) and manual (Settings button) cleanup of orphaned reflection drafts stored in AsyncStorage.

#### Implementation

**Automatic Cleanup (Silent):**
- Runs on app launch
- Removes drafts for completed reflections, deleted sessions, and sessions >48h old
- No user notification unless errors occur

**Manual Cleanup (Settings):**
```typescript
const handleCleanupDrafts = async () => {
  setIsCleaningDrafts(true);
  try {
    const cleanedCount = await cleanupOrphanedDrafts();
    Alert.alert(
      'Cleanup Complete',
      cleanedCount > 0
        ? `Removed ${cleanedCount} orphaned draft${cleanedCount === 1 ? '' : 's'}.`
        : 'No orphaned drafts found. Storage is clean.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('Error during manual cleanup:', error);
    Alert.alert(
      'Cleanup Failed',
      'An error occurred while cleaning up drafts. Please try again.',
      [{ text: 'OK' }]
    );
  } finally {
    setIsCleaningDrafts(false);
  }
};
```

#### Rationale

- **Storage Hygiene:** Prevents accumulation of stale drafts in AsyncStorage
- **User Control:** Manual trigger gives users visibility and control over storage management
- **Privacy-Aligned:** Supports the app's privacy-first approach by cleaning up potentially sensitive draft data
- **Crash Recovery:** Maintains the crash recovery benefit of drafts while preventing indefinite storage

#### Cleanup Criteria

Drafts are removed if:
1. The session has a completed reflection in the database
2. The session has been soft-deleted (`is_deleted = 1`)
3. The session ended >48h ago (expired reflection window)
4. The session ID doesn't exist in the database

#### User Impact

- Positive: Cleaner storage, better app performance over time
- Transparent: Manual cleanup shows count of removed drafts
- Safe: Only removes truly orphaned drafts, preserves active work

---

### 4. Coaching Tone Icons (v1: Format Icons)

**Status:** ✅ Implemented (Updated in v2.0)  
**Value:** Low - Visual polish  
**Location:** `screens/ReflectionToneScreen.tsx` (renamed from ReflectionFormatScreen.tsx)

#### Description

Adds emoji icons to coaching tone cards (formerly format cards) for better visual differentiation.

#### Implementation (v2.0)

```typescript
const TONE_CARDS: ToneCardData[] = [
  {
    tone: 1,
    icon: "🧭",
    title: "Facilitative – Guided Discovery",
    description: "Explore your own insights through open questions",
    bestFor: "Self-directed reflection",
  },
  {
    tone: 2,
    icon: "🔍",
    title: "Socratic – Structured Inquiry",
    description: "Challenge assumptions with purposeful questioning",
    bestFor: "Deep analysis and pattern-spotting",
  },
  {
    tone: 3,
    icon: "💪",
    title: "Supportive – Encouraging",
    description: "Build confidence with empathy and encouragement",
    bestFor: "Tough sessions or low energy",
  },
];
```

#### Rationale

- **Matches Spec:** PRD v2 specifies icons for coaching tone cards
- **Visual Clarity:** Icons help users quickly identify tones at a glance
- **Accessibility:** Emojis are universally understood and screen-reader friendly
- **Personality:** Adds warmth to the interface without being distracting

#### User Impact

- Positive: Easier tone recognition, more polished UI
- Minimal: Small visual enhancement, doesn't change functionality

---

## Alignment with PRD Goals

All enhancements support the core PRD goals:

| PRD Goal | Supporting Enhancement |
|----------|------------------------|
| "Drive at least 3 consecutive reflection Sessions per user per week" | **Blocking guard** enforces reflection completion |
| "Show >30% reduction in time and effort spent on reflection" | **Sort toggle** enables faster navigation; **AI-generated questions** reduce blank-page friction (v2) |
| "Demonstrate improved contextual learning and Practice Area progression" | **Blocking guard** maintains learning continuity; **Practice Area types** enable tailored AI guidance (v2) |
| "Provide 100% assurance of local data privacy and security" | **Draft cleanup** removes stale sensitive data; **On-device AI** ensures no cloud processing (v2) |
| "Gather actionable feedback on AI coaching effectiveness" (v2) | **AI metrics tracking** captures question/follow-up engagement |
| "Focus reflection on Kolb Steps 2-4 with optional AI coaching" (v2) | **Coaching tones** adapt prompts; **AI follow-ups** deepen reflection |

---

## Features Explicitly Deferred to Post-MVP

The following features were mentioned in the PRD but are explicitly deferred:

### 1. Filters on Timeline
**Effort:** +1 day  
**Priority:** High

- Filter by coaching tone (Facilitative/Socratic/Supportive) ← Updated for v2
- Filter by AI usage (AI-assisted vs. Manual) ← New in v2
- Filter by feedback rating (Confusing/Hard/Neutral/Good/Great)
- Filter by target met/missed

**Rationale for Deferral:**
- MVP includes visual badges for at-a-glance scanning
- Sort toggle provides basic navigation flexibility
- Filters add complexity to UI and state management
- Can be added based on user feedback about navigation needs

### 2. Synthesis & Trends View
**Effort:** +2-3 days  
**Priority:** High

- Coaching tone distribution chart ← Updated for v2
- AI adoption rate and satisfaction trends ← New in v2
- AI follow-up engagement metrics ← New in v2
- Feedback trends over time (line chart)
- Target completion rate (percentage of sessions meeting target)
- Average session duration by Practice Area

**Rationale for Deferral:**
- Requires charting library integration
- More valuable with accumulated data (post-launch)
- Export provides raw data for manual analysis
- AI metrics need baseline data before trends are meaningful
- Can prioritize based on user requests for specific insights

### 3. Configurable Deadlines
**Effort:** +0.5 days  
**Priority:** Medium

- Settings toggle: 24h/48h/Off
- Allows users to adjust reflection pressure to their preference

**Rationale for Deferral:**
- Current 24h/48h deadlines align with learning research
- Can add if users report deadline pressure issues
- Simple to implement based on feedback

### 4. Custom Target Durations
**Effort:** +0.25 days  
**Priority:** Low

- Manual input field (in addition to 15/30/45/60 min presets)
- Validation (5 min - 180 min range)

**Rationale for Deferral:**
- Four presets cover most use cases
- Adds input complexity
- Can add if users consistently request specific durations

### 5. MLC-LLM Fallback (New in v2)
**Effort:** +3-4 days  
**Priority:** Medium

- Alternative on-device LLM for non-Apple Intelligence devices
- Would enable AI features on older iOS versions

**Rationale for Deferral:**
- Adds significant complexity and bundle size
- Apple Foundation Models cover primary target audience
- Graceful degradation ensures full functionality without AI
- Can evaluate based on device distribution of users

---

## Testing & Verification

### Code Changes Verified (v1.x)

- ✅ Test duration presets removed from constants.ts
- ✅ SessionSetupScreen uses production presets only
- ✅ Blocking guard prevents new sessions with pending reflections
- ✅ Sort toggle switches between newest/oldest first
- ✅ Draft cleanup removes orphaned drafts correctly

### Code Changes Required (v2.0)

- ⬜ ReflectionFormatScreen renamed to ReflectionToneScreen
- ⬜ Coaching tone icons display correctly
- ⬜ Practice Area type dropdown works in PracticeAreaModal
- ⬜ AI toggle visible only on supported devices
- ⬜ AI questions generate in <2 seconds
- ⬜ AI follow-ups appear for brief answers (<50 chars)
- ⬜ AI metrics tracked correctly (questions, follow-ups shown/answered)
- ⬜ Graceful degradation on unsupported devices
- ⬜ Database migration from v1 schema works correctly
- ⬜ Export includes coaching_tone and AI metadata

### Documentation Updates Verified

- ✅ PRD v2 created with AI-assisted coaching redesign
- ✅ Tech Spec v2 created with full AI integration details
- ✅ Implementation Notes updated for v2 changes
- ✅ PRD updated with blocking guard user story
- ✅ PRD updated with sort toggle in Session Review section
- ✅ PRD updated with storage management in Technical Considerations
- ✅ PRD clarifies deferred features (filters, synthesis)
- ✅ Tech Spec marks filters/synthesis as Post-MVP
- ✅ Tech Spec includes Implemented Enhancements table

---

## Recommendations for Future Iterations

### Short-Term (Next Sprint)

1. **User Testing:** Validate blocking guard doesn't create frustration
2. **Analytics:** Track sort toggle usage to validate value
3. **Monitoring:** Log draft cleanup counts to verify storage hygiene
4. **AI Quality Review:** Monitor AI question and follow-up relevance (v2)
5. **Latency Monitoring:** Track AI response times against <2s target (v2)

### Medium-Term (Post-Launch)

1. **Filters on Timeline:** Implement based on user feedback about navigation needs
2. **Synthesis View:** Add charts once users have accumulated meaningful data (include AI metrics)
3. **Configurable Deadlines:** Add if users report deadline pressure issues
4. **Prompt Tuning:** Refine AI prompts based on feedback patterns (v2)
5. **Practice Area Type Recommendations:** Suggest type based on name analysis (v2)

### Long-Term (Future Versions)

1. **Custom Target Durations:** Add if preset durations don't meet user needs
2. **Countdown Timer Mode:** Alternative to count-up timer (user preference)
3. **Auto-Repair Chains:** Fix orphaned `previous_session_id` references
4. **MLC-LLM Fallback:** Enable AI on non-Apple Intelligence devices (v2)
5. **Android Support:** Expand platform reach (requires alternative LLM strategy)

---

## Conclusion

The implemented enhancements strengthen the MVP by:

1. **Enforcing Discipline:** Blocking guard ensures consistent reflection habits
2. **Improving Navigation:** Sort toggle provides flexibility without complexity
3. **Managing Storage:** Draft cleanup maintains privacy and performance
4. **Polishing UI:** Coaching tone icons match spec and improve visual clarity

**v2.0 Additions:**

5. **AI-Assisted Coaching:** Context-aware questions and follow-ups enhance reflection depth
6. **Practice Area Types:** Classification enables more relevant AI guidance
7. **Graceful Degradation:** Full functionality on all devices, AI as enhancement
8. **Privacy-First AI:** 100% on-device processing maintains privacy guarantees

All enhancements align with the core product vision of supporting reflective learning through structured, sequential practice sessions. The v2.0 AI features add value without compromising the app's privacy-first foundation. Deferred features remain valuable but can be prioritized based on real user feedback post-launch.

---

## Related Documentation

- [PRD v2](Kolbs-Cycle-App-PRD-v2.md) - Product requirements for AI-assisted coaching
- [Tech Spec v2](Kolbs-Cycle-App-Tech-Spec-v2.md) - Technical specification for v2.0
- [Tech Spec v1](Kolbs-Cycle-App-Tech-Spec-v1.md) - Original technical specification
- Prompt Engineering Document (TBD) - AI prompt design and tuning

---

**Document Maintained By:** Development Team  
**Review Cadence:** After each major feature addition  
**Next Review:** Post v2.0 launch (after 1 month of AI usage data)

