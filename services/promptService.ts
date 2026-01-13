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
  1: `You are a facilitative coach using guided discovery. Help users explore their own beliefs and emotions through clarifying questions. Never give direct answers - guide users to their own conclusions.`,

  2: `You are a Socratic coach using structured inquiry. Challenge assumptions, examine evidence, and explore implications. Ask probing questions that build critical thinking systematically.`,

  3: `You are a supportive coach providing emotional scaffolding. Offer encouragement, normalize struggle, and show empathy. Help users feel capable while providing specific assistance when needed.`,
};

/**
 * Practice Area type modifiers
 * These adapt the AI's focus based on the type of practice
 */
const TYPE_MODIFIERS: Record<PracticeAreaType, string> = {
  solo_skill: `Focus on technical execution, precision, and measurable improvement. Reference specific techniques and physical/mental processes.`,

  performance: `Address execution under pressure, audience awareness, and managing nerves. Consider preparation, presence, and recovery from mistakes.`,

  interpersonal: `Explore multiple perspectives, emotional dynamics, and relationship impact. Consider how others experienced the interaction.`,

  creative: `Encourage divergent thinking and embrace uncertainty. Explore where ideas came from and what surprised the user.`,
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
  - Do NOT wrap the output in quotes or any other characters
  - Example output: You set out to practice left-hand independence. Walk me through what you actually did—what steps did you take?

  Examples of good questions (shown without quotes for clarity):

  You set out to practice left-hand independence. Walk me through what you actually did—what steps did you take?

  Your goal was to deliver your opening without notes. What did you do step-by-step during this practice? What actually happened?

  You wanted to give constructive feedback to Sarah. What did you do during this conversation? Take me through how it unfolded.

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
    contextText += `\n  - Previous Session Goal: ${context.previousStep4Answer.slice(0, 150)}...`;
  }
  if (context.currentStepAnswers?.step2) {
    contextText += `\n  - What happened: ${context.currentStepAnswers.step2.slice(0, 150)}...`;
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

  Examples of good questions (shown without quotes for clarity):

  What patterns are you seeing between tempo and your left-hand precision on the accents?

  Which finger caused the most hesitation in your G to C chord changes?

  Which callback pattern proved hardest to refactor into async/await in Python today?

  How did your team member respond when you used clarifying questions in active listening?

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
    previousContext += `\n- What happened: ${context.currentStepAnswers.step2.slice(0, 150)}...`;
  }
  if (context.currentStepAnswers?.step3) {
    previousContext += `\n- What they learned: ${context.currentStepAnswers.step3.slice(0, 150)}...`;
  }
  if (context.previousStep4Answer) {
    previousContext += `\n- Previous session's next step: ${context.previousStep4Answer.slice(0, 150)}...`;
  }

  return `You are a ${toneName} coach helping someone reflect on their practice session.

${tonePrompt}

${typeModifier}

${contextSection}${previousContext ? `\n\nFrom this session:` + previousContext : ''}

Task: Generate a question asking what they will do or try next time.
The question should focus on specific next steps, experiments, or adjustments.
Build on their learning from today's session.

${commonRules}

GOOD question examples for "what will you do next":
Practice Area: "Piano - Hands Independence"
Intent: "Practice left-hand-only accents"
✓ "What specific tempo-related change will you test in your next hands independence practice?"

Practice Area: "Guitar - Left hand fingering"
Intent: "Improve speed on G to C chord transitions"
✓ "What specific left hand adjustment will you test for smoother G to C transitions?"

Practice Area: "Python - Async programming"
Intent: "Refactor callback hell to async/await"
✓ "What specific async pattern will you apply to the remaining callback code?"

Practice Area: "1-on-1 meetings - Active listening"
Intent: "Ask clarifying questions before offering solutions"
✓ "Which clarifying question technique will you practice in your next 1-on-1 meeting?"

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
