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

import { apple } from '@react-native-ai/apple';
import { generateText } from 'ai';
import { Platform } from 'react-native';
import { buildPlaceholderPrompt, buildFollowupPrompt, buildStepQuestionPrompt, buildIntentAnalysisPrompt, type AIContext } from './promptService';
import type { CoachingTone, PracticeAreaType } from '../utils/types';
import { getSessionCount, getRecentIntents } from '../db/queries';
import { TONE_PROMPTS } from '../utils/constants';

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
  // (errors will be caught gracefully in generatePlaceholder/generateFollowup)
  console.log('AI availability check: iOS version supported');
  return true;
};

/**
 * Generate a placeholder starter for a Kolb step
 * 
 * Creates a brief (3-6 word) contextual starter phrase to help users
 * begin their reflection. Example: "I focused on..." or "The main challenge was..."
 * 
 * @deprecated This function is kept for backward compatibility but is no longer used.
 * Use generateStepQuestion() instead for AI-generated questions.
 * 
 * @param context - AI context with practice area, intent, and tone
 * @param step - Kolb step (2, 3, or 4)
 * @returns Generated placeholder text, or null if generation fails
 */
export const generatePlaceholder = async (
  context: AIContext,
  step: 2 | 3 | 4,
): Promise<string | null> => {
  const prompt = buildPlaceholderPrompt(context, step);

  try {
    const startTime = Date.now();

    const result = await generateText({
      model: apple() as any, // Type assertion to work around dependency version mismatch
      prompt,
      maxOutputTokens: 50, // Changed from maxTokens to maxOutputTokens
      temperature: 0.7,
    });

    const latency = Date.now() - startTime;
    if (latency > LATENCY_WARNING_THRESHOLD) {
      console.warn(`AI placeholder latency exceeded target: ${latency}ms`);
    }

    return result.text?.trim() || null;
  } catch (error) {
    console.error('Placeholder generation failed:', error);
    return null;
  }
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

  try {
    const startTime = Date.now();
    const result = await generateText({
      model: apple() as any, // Type assertion to work around dependency version mismatch
      prompt,
      maxOutputTokens: 80, // Longer than placeholder (was 50) for full questions
      temperature: 0.7, // Balanced creativity
    });

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
): Promise<string | null> => {
  // Only generate follow-up if answer is brief
  if (userAnswer.length >= 50) {
    return null;
  }

  const prompt = buildFollowupPrompt(context, step, userAnswer);

  try {
    const startTime = Date.now();

    const result = await generateText({
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
    console.error('Follow-up generation failed:', error);
    return null;
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
  practiceAreaId: string,
  currentSessionId: string | null = null
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

  // Fetch session count first to optimize query
  let sessionCount = 0;
  let recentIntents: Array<{ sessionNumber: number; daysAgo: number; intent: string }> = [];

  try {
    sessionCount = await getSessionCount(practiceAreaId);

    // If it's the first session, skip the recent intents query
    if (sessionCount === 0) {
      // First session - use empty array and count = 1 (the session being created)
      recentIntents = [];
      sessionCount = 1;
    } else {
      // Fetch recent intents and increment count for the session being created
      try {
        recentIntents = await getRecentIntents(practiceAreaId, currentSessionId, 3);
      } catch (error) {
        console.error('Failed to fetch recent intents:', error);
        recentIntents = []; // Fallback to empty array
      }
      sessionCount = sessionCount + 1; // Account for the session being created
    }
  } catch (error) {
    console.error('Failed to fetch session count:', error);
    // Fallback: treat as first session
    sessionCount = 1;
    recentIntents = [];
  }

  const prompt = buildIntentAnalysisPrompt(
    userIntent,
    practiceAreaName,
    practiceAreaType,
  );

  try {
    const startTime = Date.now();
    console.log('prompt', prompt)
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
    // {"specificityLevel": "GENERIC" | "PARTIALLY_SPECIFIC" | "SPECIFIC", "clarifyingQuestions": [...], "refinedSuggestions": [...], "feedback": "..."}
    const parsed = JSON.parse(result.text.replaceAll('`', '').replace("json", ""));
    console.log('parsed', parsed)
    // Validate specificityLevel
    const level = parsed.specificityLevel;
    if (level !== "GENERIC" && level !== "PARTIALLY_SPECIFIC" && level !== "SPECIFIC") {
      console.warn('Invalid specificityLevel, defaulting to GENERIC');
      return {
        specificityLevel: "GENERIC",
        clarifyingQuestions: parsed.clarifyingQuestions || null,
        refinedSuggestions: null,
        feedback: parsed.feedback || null,
      };
    }

    return {
      specificityLevel: level,
      clarifyingQuestions: parsed.clarifyingQuestions || null,
      refinedSuggestions: parsed.refinedSuggestions || null,
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