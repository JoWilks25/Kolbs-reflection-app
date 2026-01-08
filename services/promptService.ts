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
 * Step-specific instructions for placeholder generation
 */
const PLACEHOLDER_STEP_INSTRUCTIONS: Record<2 | 3 | 4, string> = {
  2: `Generate a brief placeholder starter (3-6 words) for describing what happened during practice. Example: "I focused on..." or "The main challenge was..."`,
  3: `Generate a brief placeholder starter (3-6 words) for identifying a lesson or pattern. Example: "I noticed that..." or "The key insight was..."`,
  4: `Generate a brief placeholder starter (3-6 words) for planning next steps. Example: "Next time I will..." or "I want to try..."`,
};

/**
 * Step-specific guidance for question generation
 */
const STEP_QUESTION_GUIDANCE: Record<2 | 3 | 4, string> = {
  2: `Generate a question asking what actually happened during their practice session.
       The question should focus on concrete events, actions, observations, and outcomes.
       Reference their specific intent and practice area.`,
  3: `Generate a question asking what they learned, noticed, or discovered.
       The question should focus on insights, patterns, realizations, or understanding.
       Connect to what happened in their session.`,
  4: `Generate a question asking what they will do or try next time.
       The question should focus on specific next steps, experiments, or adjustments.
       Build on their learning from today's session.`,
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
 * Build a prompt for generating placeholder starter text
 * 
 * @param context - AI context with practice area, intent, and tone info
 * @param step - Kolb step (2, 3, or 4)
 * @returns Full prompt string for the LLM
 */
export const buildPlaceholderPrompt = (
  context: AIContext,
  step: 2 | 3 | 4,
): string => {
  const tonePrompt = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const typeModifier = TYPE_MODIFIERS[context.practiceAreaType];
  const stepInstruction = PLACEHOLDER_STEP_INSTRUCTIONS[step];

  return `${tonePrompt}

${typeModifier}

Context:
- Practice Area: ${context.practiceAreaName}
- Today's Intent: ${context.sessionIntent}
${context.previousStep4Answer ? `- Previous Session Goal: ${context.previousStep4Answer}` : ''}

${stepInstruction}

Respond with ONLY the placeholder text, nothing else.`;
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
  const tonePrompt = TONE_SYSTEM_PROMPTS[context.coachingTone];
  const typeModifier = TYPE_MODIFIERS[context.practiceAreaType];
  const stepGuidance = STEP_QUESTION_GUIDANCE[step];

  const toneName = context.coachingTone === 1
    ? 'Facilitative (guided discovery)'
    : context.coachingTone === 2
      ? 'Socratic (structured inquiry)'
      : 'Supportive (encouraging)';

  return `You are a ${toneName} coach helping someone reflect on their practice session.

      Context:
      - Practice Area: ${context.practiceAreaName} (${context.practiceAreaType})
      - Today's Intent: ${context.sessionIntent}
      ${context.previousStep4Answer ? `- Previous Session Goal: ${context.previousStep4Answer}` : ''}
      ${context.currentStepAnswers?.step2 ? `- What happened: ${context.currentStepAnswers.step2.slice(0, 200)}...` : ''}
      ${context.currentStepAnswers?.step3 ? `- What they learned: ${context.currentStepAnswers.step3.slice(0, 200)}...` : ''}
      
      Task: ${stepGuidance}
      
      Generate ONE coaching question that follows ALL these rules:
      1. Reference "${context.practiceAreaName}" OR "${context.sessionIntent}" directly
      2. Match ${context.practiceAreaType} practice type
      3. Use ${toneName} coaching style
      4. Be 10-25 words exactly
      5. End with a question mark
      6. Feel personalized to THIS specific session
      
      GOOD question examples (reference specific practice elements):
      
      Practice Area: "Piano - Hands Independence"
      Intent: "Practice left-hand-only accents"
      ✓ "How did your left hand respond when you tried to increase the tempo on those accents?"
      ✓ "What patterns are you seeing between tempo and your left-hand precision on the accents?"
      ✓ "What specific tempo-related change will you test in your next hands independence practice?"
      
      Practice Area: "Guitar - Left hand fingering"
      Intent: "Improve speed on G to C chord transitions"
      ✓ "What happened to your left hand fingering speed during the G to C transitions?"
      ✓ "Which finger caused the most hesitation in your G to C chord changes?"
      ✓ "What specific left hand adjustment will you test for smoother G to C transitions?"
      
      Practice Area: "Python - Async programming"
      Intent: "Refactor callback hell to async/await"
      ✓ "How did your Python code clarity change when converting callbacks to async/await patterns?"
      ✓ "Which callback pattern proved hardest to refactor into async/await in Python today?"
      ✓ "What specific async pattern will you apply to the remaining callback code?"
      
      Practice Area: "1-on-1 meetings - Active listening"
      Intent: "Ask clarifying questions before offering solutions"
      ✓ "What shifted in your 1-on-1 when you asked clarifying questions before problem-solving?"
      ✓ "How did your team member respond when you used clarifying questions in active listening?"
      ✓ "Which clarifying question technique will you practice in your next 1-on-1 meeting?"
      
      BAD question examples (too generic, don't reference practice area or intent):
      ✗ "What happened during practice?"
      ✗ "What did you learn?"
      ✗ "How was your session?"
      ✗ "What will you do next time?"
      ✗ "Did you improve today?"
      
      DO NOT use generic phrases like "your practice" or "your session" - always use the specific practice area name or intent details.
      DO NOT ask multiple questions - generate exactly ONE question.
      DO NOT include explanations or preamble - output ONLY the question text.
      
      Generate the question now:`.trim();
};

/**
 * Get the tone-adapted base prompt for each Kolb step
 * Used when AI is disabled but coaching tone is still selected
 */
export const getTonePromptForStep = (
  tone: CoachingTone,
  step: 2 | 3 | 4,
): string => {
  const prompts: Record<CoachingTone, Record<2 | 3 | 4, string>> = {
    1: { // Facilitative
      2: "What happened during this practice? Which moments stood out to you most?",
      3: "What are you noticing about yourself or your approach?",
      4: "What do you feel ready to explore or try next time?",
    },
    2: { // Socratic
      2: "What actually happened, step by step? What was different from what you expected?",
      3: "Looking back, what worked and what didn't? What patterns are you seeing?",
      4: "What specific change will you test in your next session?",
    },
    3: { // Supportive
      2: "What happened in this session? What parts felt most challenging or successful?",
      3: "What's the main thing you're taking away from this? What felt like progress?",
      4: "What's one small thing you'll focus on next time?",
    },
  };

  return prompts[tone][step];
};

/**
 * Build prompt for analyzing and refining session intents
 * Called when user explicitly clicks "Improve Intent" button
 * 
 * @param userIntent - The user's current intent text
 * @param practiceAreaName - Name of the practice area
 * @param practiceAreaType - Type of practice area (solo_skill, performance, interpersonal, creative)
 * @param previousStep4Answer - Previous session's step 4 answer (next action), or null
 * @returns Full prompt string for the LLM
 */
export const buildIntentAnalysisPrompt = (
  userIntent: string,
  practiceAreaName: string,
  practiceAreaType: PracticeAreaType,
  previousStep4Answer: string | null
): string => {
  const typeGuidance = {
    solo_skill: `For solo skill practice, specific intents should reference:
- Concrete techniques or movements
- Measurable targets (tempo, accuracy, duration)
- Specific exercises or sections
- Technical elements to focus on`,

    performance: `For performance practice, specific intents should reference:
- Specific scenarios or contexts (presentation section, game situation)
- Audience or pressure elements
- Particular anxieties or challenges to address
- Preparation strategies to test`,

    interpersonal: `For interpersonal practice, specific intents should reference:
- Specific people or relationship types
- Particular communication challenges or goals
- Specific behaviors or approaches to try
- Concrete situations or conversations`,

    creative: `For creative practice, specific intents should reference:
- Specific creative constraints or prompts
- Particular techniques or styles to explore
- Concrete experiments or variations to try
- Specific materials or tools to work with`
  };

  return `
You are helping a user set a specific, actionable intent for a practice session.

Practice Area: ${practiceAreaName} (${practiceAreaType})
${previousStep4Answer ? `Previous session goal: "${previousStep4Answer}"` : 'First session in this Practice Area'}

User's intent: "${userIntent}"

Task: Analyze whether this intent is specific enough for effective practice.

${typeGuidance[practiceAreaType]}

Examples of GENERIC intents (need refinement):
- "practice piano" → too broad, no focus
- "get better at speaking" → not measurable, no specific goal
- "work on coding" → no concrete task
- "improve" → completely vague

Examples of SPECIFIC intents (good as-is):
- "increase tempo to 120 BPM on left-hand accents in F major"
- "practice managing Q&A nervousness with pausing technique"
- "implement error handling for the session list component"
- "write 500 words using only dialogue tags"

Instructions:
1. Is the user's intent specific enough? Consider:
   - Does it reference concrete elements of ${practiceAreaName}?
   - Is it clear what they'll actually DO during practice?
   - Can progress be measured or observed?
   - Is it focused on one clear thing?

2. If NOT specific enough, generate ONE refined version that:
   - References specific aspects of "${practiceAreaName}"
   - Is actionable and measurable
   ${previousStep4Answer ? `- Builds naturally on their previous goal: "${previousStep4Answer}"` : '- Provides a clear starting point'}
   - Is 5-20 words long
   - Maintains the spirit of their original intent

3. Provide brief reasoning (15 words max) explaining what makes it generic or why it's already good.

Respond ONLY with valid JSON in this exact format:
{
  "isSpecific": true or false,
  "suggestion": "refined intent text" or null (null if already specific),
  "reasoning": "brief explanation"
}
`.trim();
};

