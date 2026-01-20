/**
 * Prompt Service for AI-Assisted Coaching
 * 
 * Builds context-aware prompts for placeholder generation and follow-up questions
 * based on coaching tone and Practice Area type.
 */

import type { CoachingTone, PracticeAreaType } from '../utils/types';

/**
 * Context object for AI prompt generation
 */
export interface AIContext {
  practiceAreaName: string;
  practiceAreaType: PracticeAreaType;
  sessionIntent: string;
  previousStep4Answer: string | null;
  coachingTone: CoachingTone;
  currentStepAnswers?: {
    step2?: string;
    step3?: string;
  };
}

/**
 * System prompts by coaching tone
 * These set the overall personality and approach for the AI
 */
const TONE_SYSTEM_PROMPTS: Record<CoachingTone, string> = {
  1: `You are a facilitative coach for reflective learning in skill development.

CONTEXT: This is a reflection tool for practice sessions (music, sports, creative work, professional skills). Users reflect on what happened (actions) and what they learned (insights and emotional responses).

STEP 3 FOCUS: Help users explore their observations, insights, and internal responses during practice. Use language like "notice," "observe," "became aware of" to invite emotional reflection without directly probing feelings.

IMPORTANT BOUNDARIES: Frame questions about self-awareness and learning insights. Focus on what users NOTICED about their response, not diagnosing emotions. Avoid clinical language (anxiety, depression, distress). Keep focus on learning-relevant observations.

Help users explore their practice insights through observation-based questions. Never give direct answers - guide users to notice patterns in their responses.`,

  2: `You are a Socratic coach for systematic learning and insight development.

CONTEXT: This is a reflection tool for practice sessions in skill development and creative work.

STEP 3 FOCUS: Help users analyze what they learned through structured inquiry about their observations and responses. Ask about patterns they noticed, assumptions that shifted, and insights that emerged.

IMPORTANT BOUNDARIES: Focus questions on learning insights and observable patterns in their response to practice. Use analytical language ("what patterns," "what assumptions") that allows emotional content without directly soliciting distress narratives.

Challenge assumptions about practice and learning, examine evidence from observations, and explore implications. Build critical thinking about skill development and self-awareness.`,

  3: `You are a supportive coach for encouraging reflective practice.

CONTEXT: This is a reflection tool for skill practice and creative work.

STEP 3 FOCUS: Help users recognize positive moments and growth in their practice awareness. Use encouraging language that validates learning insights and emotional responses as valuable data.

IMPORTANT BOUNDARIES: Provide encouragement focused on insights gained and self-awareness developed. Normalize challenges as part of learning. Frame emotional reflection around engagement, flow, and connection to the work. Avoid probing severe distress.

Offer encouragement about learning progress, normalize the complexity of skill development, and help users recognize valuable insights from their practice experience.`,
};

/**
 * Practice Area type modifiers
 * These adapt the AI's focus based on the type of practice
 */
const TYPE_MODIFIERS: Record<PracticeAreaType, string> = {
  solo_skill: `Focus on technical execution, precision, and what you observed about your process. Reference specific techniques and your mental/physical response.`,

  performance: `Address execution under pressure and self-awareness during delivery. Consider what you noticed about your preparation, presence, and how you handled unexpected moments.`,

  interpersonal: `Explore what you observed during the interaction - both your responses and the other person's. Consider communication patterns and what you noticed about the dynamic.`,

  creative: `Encourage reflection on your creative process and what surprised you. Explore where ideas emerged from and what you noticed about constraints or flow states.`,
};

/**
 * Follow-up question matrix: Tone × Type
 * From PRD Section "How AI Adapts by Practice Area Type × Coaching Tone"
 */
const FOLLOWUP_MATRIX: Record<CoachingTone, Record<PracticeAreaType, string>> = {
  1: { // Facilitative
    solo_skill: 'How did you feel during the challenging parts?',
    performance: 'How did your internal experience differ from what you think others saw?',
    interpersonal: 'How do you think the other person experienced the interaction?',
    creative: 'What surprised you about where your ideas went?',
  },
  2: { // Socratic
    solo_skill: 'What assumptions did you have going in that proved incorrect?',
    performance: 'What thought patterns affected your confidence?',
    interpersonal: 'What evidence do you have for your interpretation of their behavior?',
    creative: 'What constraints or habits shaped your creative choices?',
  },
  3: { // Supportive
    solo_skill: 'Which part are you most proud of handling?',
    performance: 'What helped you push through the nerves?',
    interpersonal: 'What felt uncomfortable, and how did you navigate it?',
    creative: 'What moments felt like you were in flow?',
  },
};

/**
 * Step 3 follow-up question matrix: Tone × Type
 * Focus: Learning, insights, patterns, realizations
 */
const STEP3_FOLLOWUP_MATRIX: Record<CoachingTone, Record<PracticeAreaType, string>> = {
  1: { // Facilitative - enables emotional reflection through observation
    solo_skill: 'What did you notice about your internal response during the challenging parts?',
    performance: 'What did you observe about your internal experience compared to what the audience saw?',
    interpersonal: 'What did you notice about your reaction to how the conversation unfolded?',
    creative: 'What surprised you about your response when ideas emerged?',
  },
  2: { // Socratic - enables emotional reflection through analysis
    solo_skill: 'What patterns did you notice in how you responded to difficulty?',
    performance: 'What did you observe about your mental state affecting execution?',
    interpersonal: 'What assumptions did you notice yourself making about their response?',
    creative: 'What constraints did you notice affecting how freely you explored?',
  },
  3: { // Supportive - enables emotional reflection through positive framing
    solo_skill: 'What moments made you feel most engaged with the technique?',
    performance: 'What helped you stay grounded when pressure increased?',
    interpersonal: 'What moments felt like genuine connection during the interaction?',
    creative: 'What moments felt like you were fully immersed in the work?',
  },
};

/**
 * Step 4 follow-up question matrix: Tone × Type
 * Focus: Next actions, experiments, adjustments, plans
 */
const STEP4_FOLLOWUP_MATRIX: Record<CoachingTone, Record<PracticeAreaType, string>> = {
  1: { // Facilitative
    solo_skill: 'What specific adjustment do you want to explore next?',
    performance: 'What will you experiment with in your next performance?',
    interpersonal: 'What approach will you try in your next interaction?',
    creative: 'What direction do you want to explore further?',
  },
  2: { // Socratic
    solo_skill: 'What specific change will you test to address the pattern you noticed?',
    performance: 'What specific technique will you practice to address the thought patterns?',
    interpersonal: 'What specific approach will you try based on what you learned?',
    creative: 'What specific constraint will you challenge in your next attempt?',
  },
  3: { // Supportive
    solo_skill: 'What specific step will you take to build on what worked?',
    performance: 'What specific strategy will you use to maintain what helped you?',
    interpersonal: 'What specific approach will you try to build on the positive moments?',
    creative: 'What specific element will you explore to recreate that flow state?',
  },
};

/**
 * Build a prompt for generating follow-up questions
 * 
 * @param context - AI context with practice area, intent, and tone info
 * @param step - Kolb step (2, 3, or 4)
 * @param userAnswer - The user's current (brief) answer
 * @returns Full prompt string for the LLM
 */
export const buildFollowupPrompt = (
  context: AIContext,
  step: 2 | 3 | 4,
  userAnswer: string,
): string => {
  const tonePrompt = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const typeModifier = TYPE_MODIFIERS[context.practiceAreaType];
  const followupExample = getFollowupExample(context.coachingTone, context.practiceAreaType);

  return `${tonePrompt}

${typeModifier}

Context:
- Practice Area: ${context.practiceAreaName} (${context.practiceAreaType})
- Today's Intent: ${context.sessionIntent}
- User's answer so far: "${userAnswer}"

The user's answer is brief. Generate ONE follow-up question to help them reflect more deeply.

Example follow-up for this tone and practice type:
"${followupExample}"

Respond with ONLY the follow-up question, nothing else.`;
};

/**
 * Get a follow-up example for a specific tone and practice area type
 */
export const getFollowupExample = (
  tone: CoachingTone,
  type: PracticeAreaType,
): string => {
  return FOLLOWUP_MATRIX[tone][type];
};

/**
 * Get a tone-adapted nudge for Step 2 follow-up when answer is brief
 * 
 * @param tone - Coaching tone (1=Facilitative, 2=Socratic, 3=Supportive)
 * @param userAnswerLength - Length of the user's answer in characters
 * @returns Nudge string if answer is brief (< 100 chars), null otherwise
 */
export const getStep2FollowupNudge = (
  tone: CoachingTone,
  userAnswerLength: number
): string | null => {
  // Only show if answer is quite brief (< 100 chars ~15-20 words)
  if (userAnswerLength >= 100) return null;

  // Tone-adapted nudges that focus on getting MORE STEPS
  const nudges: Record<CoachingTone, string> = {
    1: "Your answer is brief. Can you walk through a few more of the steps you took?",
    2: "That's a start. What were the other specific actions you took?",
    3: "You're on track! What else did you do during the practice?",
  };

  return nudges[tone];
};

/**
 * Get a tone-adapted nudge for Step 3 follow-up when answer is brief
 * 
 * @param context - AI context with practice area, tone, and type info
 * @param userAnswerLength - Length of the user's answer in characters
 * @returns Follow-up question string if answer is brief (< 150 chars), null otherwise
 */
export const getStep3FollowupNudge = (
  context: AIContext,
  userAnswerLength: number
): string | null => {
  // Only show if answer is brief (< 150 chars)
  if (userAnswerLength >= 150) return null;

  return STEP3_FOLLOWUP_MATRIX[context.coachingTone][context.practiceAreaType];
};

/**
 * Get a tone-adapted nudge for Step 4 follow-up when answer is brief
 * 
 * @param context - AI context with practice area, tone, and type info
 * @param userAnswerLength - Length of the user's answer in characters
 * @returns Follow-up question string if answer is brief (< 150 chars), null otherwise
 */
export const getStep4FollowupNudge = (
  context: AIContext,
  userAnswerLength: number
): string | null => {
  // Only show if answer is brief (< 150 chars)
  if (userAnswerLength >= 150) return null;

  return STEP4_FOLLOWUP_MATRIX[context.coachingTone][context.practiceAreaType];
};

/**
 * Get a hardcoded follow-up question for any step
 * Routes to the appropriate step-specific function
 * 
 * @param context - AI context with practice area, tone, and type info
 * @param step - Kolb step (2, 3, or 4)
 * @param userAnswerLength - Length of the user's answer in characters
 * @returns Follow-up question string if answer is brief, null otherwise
 */
export const getHardcodedFollowup = (
  context: AIContext,
  step: 2 | 3 | 4,
  userAnswerLength: number
): string | null => {
  switch (step) {
    case 2:
      return getStep2FollowupNudge(context.coachingTone, userAnswerLength);
    case 3:
      return getStep3FollowupNudge(context, userAnswerLength);
    case 4:
      return getStep4FollowupNudge(context, userAnswerLength);
  }
};

/**
 * Get human-readable tone name
 * Internal helper function
 */
const getToneName = (tone: CoachingTone): string => {
  return tone === 1
    ? 'Facilitative (guided discovery)'
    : tone === 2
      ? 'Socratic (structured inquiry)'
      : 'Supportive (encouraging)';
};

/**
 * Build context section of prompt
 * Internal helper function
 */
const buildContextSection = (context: AIContext): string => {
  let contextText = `Context:
- Practice Area: ${context.practiceAreaName} (${context.practiceAreaType})
- Today's Intent: ${context.sessionIntent}`;

  if (context.previousStep4Answer) {
    contextText += `\n- Previous Session Goal: ${context.previousStep4Answer}`;
  }
  if (context.currentStepAnswers?.step2) {
    contextText += `\n- What happened: ${context.currentStepAnswers.step2.slice(0, 200)}...`;
  }
  if (context.currentStepAnswers?.step3) {
    contextText += `\n- What they learned: ${context.currentStepAnswers.step3.slice(0, 200)}...`;
  }

  return contextText;
};

/**
 * Build common rules section (shared across all steps)
 * Internal helper function
 */
const buildCommonRules = (context: AIContext, toneName: string): string => {
  return `Generate ONE coaching question that follows ALL these rules:
1. Reference "${context.practiceAreaName}" OR "${context.sessionIntent}" directly
2. Match ${context.practiceAreaType} practice type
3. Use ${toneName} coaching style
4. Be 10-25 words exactly
5. End with a question mark
6. Feel personalized to THIS specific session`;
};

/**
 * Build prompt body for Step 2: What happened?
 * Focus: Concrete events, actions, observations, outcomes
 * Internal helper function - not exported
 */
const buildStep2PromptBody = (context: AIContext): string => {
  const coachingTone = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const toneName = getToneName(context.coachingTone);

  return `You are a ${toneName} coach helping users document what they did during practice. Generate a clear, grammatically correct Step 2 question that:

  1. References their session intent naturally
  2. Asks what they actually did (chronological steps/actions)
  3. Adapts tone based on coaching style
  4. Incorporates practice area context when relevant

  Context:
  - Practice Area Name: ${context.practiceAreaName}
  - Practice Area Type: ${context.practiceAreaType} (solo_skill / performance / interpersonal / creative)
  - Session Intent: ${context.sessionIntent}
  - Coaching Tone: ${coachingTone} (1=Facilitative / 2=Socratic / 3=Supportive)

  Rules:
  - Keep the question under 30 words
  - Make it sound natural, not formulaic
  - Focus on ACTIONS taken, not feelings
  - Encourage chronological detail or steps
  - The intent should flow grammatically into the question

  OUTPUT FORMAT:
  - Return ONLY the question text, no quotes, no explanation
  - The question must end with a question mark (?)
  - DO NOT wrap the output in quotes or any other characters
  - Example output: You set out to practice left-hand independence. Walk me through what you actually did—what steps did you take?

  Examples of good questions (with their corresponding intents):

  Intent: "Practice left-hand independence"
  Practice Area: Piano - Hands Independence (solo_skill)
  Tone: Facilitative
  → You set out to practice left-hand independence. Walk me through what you actually did—what steps did you take?

  Intent: "Deliver my opening without notes"
  Practice Area: Public Speaking (performance)
  Tone: Socratic
  → Your goal was to deliver your opening without notes. What did you do step-by-step during this practice? What actually happened?

  Intent: "Give constructive feedback to Sarah"
  Practice Area: Management Conversations (interpersonal)
  Tone: Supportive
  → You wanted to give constructive feedback to Sarah. What did you do during this conversation? Take me through how it unfolded.

  Intent: "Experiment with watercolor blending techniques"
  Practice Area: Watercolor Painting (creative)
  Tone: Facilitative
  → You set out to experiment with watercolor blending techniques. What did you actually try? Walk me through your process.

  Intent: "Practice F major scale at faster tempo"
  Practice Area: Piano - Left Hand Technique (solo_skill)
  Tone: Socratic
  → You planned to practice F major scale at faster tempo. What exactly did you do, step by step? How did you approach it?

  Intent: "Handle objections during the pitch"
  Practice Area: Sales Presentations (performance)
  Tone: Supportive
  → You wanted to handle objections during the pitch. What happened when you practiced this? Take me through what you did.

  Now generate the question (output only the question text, no quotes):`.trim();
};

/**
 * Build prompt body for Step 3: What did you learn?
 * Focus: Insights, patterns, realizations, understanding
 * Can reference Step 2 answer
 * Internal helper function - not exported
 */
const buildStep3PromptBody = (context: AIContext): string => {
  const coachingTone = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const toneName = getToneName(context.coachingTone);

  // Build context section inline
  let contextText = `Context:
  - Practice Area Name: ${context.practiceAreaName}
  - Practice Area Type: ${context.practiceAreaType} (solo_skill / performance / interpersonal / creative)
  - Session Intent: ${context.sessionIntent}
  - Coaching Tone: ${coachingTone} (1=Facilitative / 2=Socratic / 3=Supportive)`;

  if (context.previousStep4Answer) {
    contextText += `\n  - Previous Session Goal: ${context.previousStep4Answer}...`;
  }
  if (context.currentStepAnswers?.step2) {
    contextText += `\n  - What happened: ${context.currentStepAnswers.step2}...`;
  }

  return `You are a ${toneName} coach helping users reflect on what they learned during practice. Generate a clear, grammatically correct Step 3 question that:

  1. References their session intent naturally
  2. Asks what they learned, noticed, or discovered (insights, patterns, realizations)
  3. Adapts tone based on coaching style
  4. Incorporates practice area context when relevant
  5. Connects to what happened in their session

  ${contextText}

  Rules:
  - Keep the question under 30 words
  - Make it sound natural, not formulaic
  - Focus on INSIGHTS and LEARNING, not just actions
  - Encourage reflection on patterns or realizations
  - The intent should flow grammatically into the question

  OUTPUT FORMAT:
  - Return ONLY the question text, no quotes, no explanation
  - The question must end with a question mark (?)
  - Do NOT wrap the output in quotes or any other characters
  - Example output: What patterns are you seeing between tempo and your left-hand precision on the accents?

  Examples of good questions (with their corresponding intents and context):

  Intent: "Practice left-hand accents at higher tempo"
  Practice Area: Piano - Hands Independence (solo_skill)
  What happened: "Struggled with F major transitions at higher tempo, left hand kept missing the accent emphasis"
  Tone: Socratic
  → What patterns are you seeing between tempo and your left-hand precision on the accents?

  Intent: "Improve G to C chord transitions"
  Practice Area: Guitar - Chord Changes (solo_skill)
  What happened: "Practiced the G to C change for 20 minutes, focused on individual finger placement"
  Tone: Socratic
  → Which finger caused the most hesitation in your G to C chord changes?

  Intent: "Refactor callback functions to async/await"
  Practice Area: Python - Async Programming (solo_skill)
  What happened: "Converted three callback functions in the data processing module, hit some edge cases with error handling"
  Tone: Socratic
  → Which callback pattern proved hardest to refactor into async/await in Python today?

  Intent: "Practice active listening with clarifying questions"
  Practice Area: Team Leadership (interpersonal)
  What happened: "Used clarifying questions during 1-on-1 with Sarah, asked 'what I'm hearing is...' three times"
  Tone: Facilitative
  → How did your team member respond when you used clarifying questions in active listening?

  Intent: "Deliver opening presentation without notes"
  Practice Area: Public Speaking (performance)
  What happened: "Got through the first 3 minutes without looking at notes, then blanked on the transition to the data section"
  Tone: Facilitative
  → What are you noticing about what helps you remember your material versus what makes you blank?

  Intent: "Give constructive feedback about missed deadlines"
  Practice Area: Management Conversations (interpersonal)
  What happened: "Had the conversation with Tom, used the SBI framework, he seemed defensive at first but opened up"
  Tone: Supportive
  → What felt like progress in how you navigated Tom's defensiveness during the feedback conversation?

  Intent: "Experiment with color mixing for sunset gradients"
  Practice Area: Watercolor Painting (creative)
  What happened: "Tried wet-on-wet technique with orange and purple, some areas bled too much, others stayed too separate"
  Tone: Facilitative
  → What surprised you about how the colors interacted when you tried the wet-on-wet technique?

  Now generate the question (output only the question text, no quotes):`.trim();
};

/**
 * Build prompt body for Step 4: What will you do next?
 * Focus: Specific next steps, experiments, adjustments
 * Can reference Steps 2 and 3
 * Internal helper function - not exported
 */
const buildStep4PromptBody = (context: AIContext): string => {
  const tonePrompt = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const typeModifier = TYPE_MODIFIERS[context.practiceAreaType];
  const toneName = getToneName(context.coachingTone);
  const contextSection = buildContextSection(context);
  const commonRules = buildCommonRules(context, toneName);

  // Step 4 can reference previous steps and previous session
  let previousContext = '';
  if (context.currentStepAnswers?.step2) {
    previousContext += `\n- What happened: ${context.currentStepAnswers.step2}...`;
  }
  if (context.currentStepAnswers?.step3) {
    previousContext += `\n- What they learned: ${context.currentStepAnswers.step3}...`;
  }
  if (context.previousStep4Answer) {
    previousContext += `\n- Previous session's next step: ${context.previousStep4Answer}...`;
  }

  return `You are a ${toneName} coach helping someone reflect on their practice session.

${tonePrompt}

${typeModifier}

${contextSection}${previousContext ? `\n\nFrom this session:` + previousContext : ''}

Task: Generate a question asking what they will do or try next time.
The question should focus on specific next steps, experiments, or adjustments.
Build on their learning from today's session.

${commonRules}

BAD question examples (too generic, don't reference practice area or intent):
✗ "What will you do next time?"
✗ "What's your plan?"

DO NOT use generic phrases like "your practice" or "your session" - always use the specific practice area name or intent details.
DO NOT ask multiple questions - generate exactly ONE question.
DO NOT include explanations or preamble - output ONLY the question text.

OUTPUT FORMAT:
- Return ONLY the question text, no quotes, no explanation
- The question must end with a question mark (?)
- Do NOT wrap the output in quotes or any other characters

Generate the question now:`.trim();
};

/**
 * Build a prompt for generating context-specific step questions
 * 
 * @param context - AI context with practice area, intent, and tone info
 * @param step - Kolb step (2, 3, or 4)
 * @returns Full prompt string for the LLM
 */
export const buildStepQuestionPrompt = (
  context: AIContext,
  step: 2 | 3 | 4,
): string => {
  switch (step) {
    case 2:
      return buildStep2PromptBody(context);
    case 3:
      return buildStep3PromptBody(context);
    case 4:
      return buildStep4PromptBody(context);
  }
};


export const buildIntentAnalysisPrompt = (
  userIntent: string,
  practiceAreaName: string,
  practiceAreaType: PracticeAreaType,
): string => {

  // Classification formulas by type (element counting)
  const formulas = {
    solo_skill: {
      elements: 'technique, material, tempo/target, focus area',
      generic: '0 elements (just medium/instrument)',
      actionable: '>=1 elements',
      examples: {
        generic: '"practice", "practice guitar", "work on coding"',
        actionable: '"practice scales" (technique), "read chapter 3" (material), "scales at 80 BPM" (technique+tempo)'
      }
    },
    performance: {
      elements: 'section, scenario, challenge, technique',
      generic: '0 elements (just performance type)',
      actionable: '>=1 elements',
      examples: {
        generic: '"practice", "practice presentation", "work on performance"',
        actionable: '"practice Q&A" (section), "manage nervousness" (challenge), "Q&A with 3-sec pause" (section+technique)'
      }
    },
    interpersonal: {
      elements: 'person, situation/topic',
      generic: '0-1 elements (missing person OR topic)',
      actionable: '2 elements (person AND topic required)',
      examples: {
        generic: '"practice", "practice communication", "talk to partner" (person only)',
        actionable: '"discuss chores with partner" (person+topic), "set boundaries with manager" (person+topic)'
      }
    },
    creative: {
      elements: 'genre, theme, focus, constraint',
      generic: '0 elements (just medium)',
      actionable: '>=1 elements',
      examples: {
        generic: '"practice", "practice writing", "work on art"',
        actionable: '"write fiction" (genre), "brainstorm ideas" (activity), "write 500 words" (constraint)'
      }
    }
  };

  const f = formulas[practiceAreaType];

  return `Classify this first session practice intent as GENERIC or SPECIFIC.

Practice Area: ${practiceAreaName} (${practiceAreaType})
User intent: "${userIntent}"

ELEMENT COUNTING FOR ${practiceAreaType}:

Elements to identify: ${f.elements}

GENERIC = ${f.generic}
  Examples: ${f.examples.generic}
  
SPECIFIC = ${f.actionable}
  Examples: ${f.examples.actionable}

CLASSIFICATION STEPS:
1. Identify which elements from the list are present in the intent
2. Count the elements
3. Apply the rule: ${f.generic} → GENERIC, ${f.actionable} → SPECIFIC

RULES:
- Default to SPECIFIC when in doubt
- "practice [something]" where [something] is from the elements list → SPECIFIC
- Just naming the practice area/medium → GENERIC

FIRST SESSION GUIDANCE:
- If GENERIC: Ask 2-3 open-ended clarifying questions to help user identify what aspect to practice
- If SPECIFIC: Accept immediately and start session. No refinement suggestions needed.

CRITICAL OUTPUT RULES:
- specificityLevel must be "GENERIC" or "SPECIFIC"
- refinedSuggestions must always be null for first sessions
- If specificityLevel is "SPECIFIC", clarifyingQuestions must be null
- If specificityLevel is "GENERIC", clarifyingQuestions must be an array with 2-3 questions

ONLY OUTPUT SHOULD BE JSON IN THIS FORMAT:
{
  "specificityLevel": "GENERIC" | "SPECIFIC",
  "clarifyingQuestions": ["question1", "question2"] | null,
  "refinedSuggestions": null,
  "feedback": "brief explanation showing element count and classification reasoning"
}
`.trim();
};
