/**
 * AI Service for Apple Intelligence Integration
 * 
 * Provides on-device LLM inference using Apple Foundation Models via react-native-ai.
 * All AI processing happens locally - no cloud dependencies.
 * 
 * Requirements:
 * - iOS 26+
 * - Apple Intelligence-enabled device (iPhone 15 Pro+, M-series iPad/Mac)
 */

// import { apple } from '@react-native-ai/apple';
import { generateText } from 'ai';
import { Platform } from 'react-native';
import { buildFollowupPrompt, buildStepQuestionPrompt, buildIntentAnalysisPrompt, getStep2FollowupNudge, getHardcodedFollowup, type AIContext } from './promptService';
import type { CoachingTone, PracticeAreaType } from '../utils/types';
import { TONE_PROMPTS } from '../utils/constants';

const apple =
  Platform.OS === 'ios'
    ? require('@react-native-ai/apple').apple
    : null;

// Re-export AIContext for consumers
export type { AIContext } from './promptService';

// Target latency threshold (ms)
const LATENCY_WARNING_THRESHOLD = 2000;

/**
 * Check if Apple Intelligence is available on this device
 * 
 * Requires:
 * - iOS 26 or later
 * - Apple Intelligence-enabled hardware (iPhone 15 Pro+, M-series chips)
 * 
 * @returns true if AI features are available, false otherwise
 */
export const checkAIAvailability = async (): Promise<boolean> => {
  // Only available on iOS
  if (Platform.OS !== 'ios') {
    console.log('AI unavailable: Not running on iOS');
    return false;
  }

  const aiEnabled = await apple.isAvailable();
  if (!aiEnabled) {
    console.log('AI unavailable apple.isAvailable() false');
    return false;
  }

  // Check iOS version (must be >= 26)
  const iosVersion = parseInt(Platform.Version as string, 10);
  if (iosVersion < 26) {
    console.log(`AI unavailable: iOS ${iosVersion} < 26`);
    return false;
  }

  // The apple() provider doesn't expose isAvailable, so we check version only
  // Actual hardware availability will be determined when we try to use it
  // (errors will be caught gracefully in generateStepQuestion/generateFollowup)
  console.log('AI availability check: iOS version supported');
  return true;
};

/**
 * Generate a context-specific question for a Kolb reflection step
 * This replaces the static prompts with AI-generated, personalized questions
 * 
 * @param context - AI context with practice area, intent, and tone
 * @param step - Kolb step (2, 3, or 4)
 * @returns Generated question text, or null if generation fails
 */
export const generateStepQuestion = async (
  context: AIContext,
  step: 2 | 3 | 4,
): Promise<string | null> => {
  const prompt = buildStepQuestionPrompt(context, step);
  console.log('generateStepQuestion: prompt', prompt)
  try {
    const startTime = Date.now();
    const result = await generateText({
      model: apple() as any, // Type assertion to work around dependency version mismatch
      prompt,
      maxOutputTokens: 80, // Full question length
      temperature: 0.7, // Balanced creativity
    });
    // console.log('result', result)
    const latency = Date.now() - startTime;
    if (latency > LATENCY_WARNING_THRESHOLD) {
      console.warn(`AI question generation latency exceeded target: ${latency}ms`);
    }
    const question = result.text?.trim();

    // Validation: ensure it's actually a question
    if (!question || !question.endsWith('?')) {
      console.warn('Generated text is not a question, using fallback');
      return null;
    }

    return question;
  } catch (error) {
    console.error('Step question generation failed:', error);
    return null; // Will fallback to static prompt
  }
};

/**
 * Get tone-adapted prompt for a specific step
 * 
 * @param tone - Coaching tone (1=Facilitative, 2=Socratic, 3=Supportive)
 * @param step - Kolb step (2, 3, or 4)
 * @returns Static prompt string for the given tone and step
 */
const getTonePromptForStep = (
  tone: CoachingTone,
  step: 2 | 3 | 4,
): string => {
  if (step === 2) {
    return TONE_PROMPTS[tone].step2;
  } else if (step === 3) {
    return TONE_PROMPTS[tone].step3;
  } else {
    return TONE_PROMPTS[tone].step4;
  }
};

/**
 * Get static fallback prompt when AI is unavailable or fails
 * 
 * @param tone - Coaching tone (1=Facilitative, 2=Socratic, 3=Supportive)
 * @param step - Kolb step (2, 3, or 4)
 * @returns Static prompt string for the given tone and step
 */
export const getStaticPromptForTone = (
  tone: CoachingTone,
  step: 2 | 3 | 4,
): string => {
  return getTonePromptForStep(tone, step);
};

/**
 * Generate a follow-up question based on user's brief answer
 * 
 * Only generates follow-ups when the user's answer is brief (<50 chars),
 * providing an opportunity for deeper reflection.
 * 
 * @param context - AI context with practice area, intent, and tone
 * @param step - Kolb step (2, 3, or 4)
 * @param userAnswer - The user's current answer
 * @returns Generated follow-up question, or null if not needed/fails
 */
export const generateFollowup = async (
  context: AIContext,
  step: 2 | 3 | 4,
  userAnswer: string,
  useHardcoded: boolean = false,
): Promise<string | null> => {
  // Only generate follow-up if answer is brief
  if (userAnswer.length >= 150) {
    return null;
  }

  // For step 2, use tone-adapted nudge instead of AI generation
  if (step === 2) {
    return getStep2FollowupNudge(context.coachingTone, userAnswer.length);
  }

  // If hardcoded mode is requested, skip AI generation
  if (useHardcoded) {
    return getHardcodedFollowup(context, step, userAnswer.length);
  }

  // For steps 3 and 4, try AI generation with hardcoded fallback
  const prompt = buildFollowupPrompt(context, step, userAnswer);
  let result;
  try {
    const startTime = Date.now();

    result = await generateText({
      model: apple() as any, // Type assertion to work around dependency version mismatch
      prompt,
      maxOutputTokens: 100, // Changed from maxTokens to maxOutputTokens
      temperature: 0.8,
    });

    const latency = Date.now() - startTime;
    if (latency > LATENCY_WARNING_THRESHOLD) {
      console.warn(`AI follow-up latency exceeded target: ${latency}ms`);
    }

    return result.text?.trim() || null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('unsafe')) {
      console.warn('Guardrail violation:', {
        step,
        practiceAreaType: context.practiceAreaType,
        answerSnippet: userAnswer.substring(0, 50), // First 50 chars only
        tone: context.coachingTone
      });
      return getHardcodedFollowup(context, step, userAnswer.length);
    }
    console.error('Follow-up generation failed:', error);
    // Fallback to hardcoded follow-up when AI fails
    return getHardcodedFollowup(context, step, userAnswer.length);
  }
};

/**
 * Analyze user intent and provide refinement suggestion if too generic
 * Called when user explicitly clicks "Improve Intent" button
 * 
 * @param userIntent - The user's current intent text
 * @param practiceAreaName - Name of the practice area
 * @param practiceAreaType - Type of practice area
 * @param previousStep4Answer - Previous session's step 4 answer (next action), or null
 * @param practiceAreaId - The ID of the practice area (for fetching session history)
 * @param currentSessionId - Optional current session ID to exclude from recent intents (null during session setup)
 * @returns Analysis result with specificity flag, suggestion, and reasoning
 */
export const analyzeIntentForFirstSession = async (
  userIntent: string,
  practiceAreaName: string,
  practiceAreaType: PracticeAreaType,
): Promise<{
  specificityLevel: "GENERIC" | "PARTIALLY_SPECIFIC" | "SPECIFIC";
  clarifyingQuestions: string[] | null;
  refinedSuggestions: string[] | null;
  feedback: string | null;
}> => {
  // Validate minimum length
  if (userIntent.trim().length < 5) {
    return {
      specificityLevel: "GENERIC",
      clarifyingQuestions: null,
      refinedSuggestions: null,
      feedback: "Intent too short - add more detail"
    };
  }

  const prompt = buildIntentAnalysisPrompt(
    userIntent,
    practiceAreaName,
    practiceAreaType,
  );

  try {
    const startTime = Date.now();
    const result = await generateText({
      model: apple() as any, // Type assertion to work around dependency version mismatch
      prompt,
      maxOutputTokens: 150, // Slightly more for reasoning
      temperature: 0.6,
    });

    const latency = Date.now() - startTime;
    if (latency > LATENCY_WARNING_THRESHOLD) {
      console.warn(`Intent analysis latency exceeded target: ${latency}ms`);
    }

    // Parse response: expect JSON format
    // {"specificityLevel": "GENERIC" | "SPECIFIC", "clarifyingQuestions": [...], "refinedSuggestions": null, "feedback": "..."}
    const parsed = JSON.parse(result.text.trim().replaceAll('`', '').replace("json", ""));

    return {
      specificityLevel: parsed.specificityLevel,
      clarifyingQuestions: parsed.clarifyingQuestions || null,
      refinedSuggestions: null, // First sessions don't need refined suggestions
      feedback: parsed.feedback || null,
    };
  } catch (error) {
    console.error('Intent analysis failed:', error);
    // Return error state
    return {
      specificityLevel: "GENERIC",
      clarifyingQuestions: null,
      refinedSuggestions: null,
      feedback: "Analysis unavailable - please try again"
    };
  }
};