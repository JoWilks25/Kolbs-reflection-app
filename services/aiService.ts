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
import { buildPlaceholderPrompt, buildFollowupPrompt, type AIContext } from './promptService';

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

  if (!apple.isAvailable()) {
    console.log('Apple Intelligence not available - using fallback');
    return false;
  }

  // Debug: Log what Platform.Version actually returns
  const versionString = Platform.Version as string;
  const iosVersion = parseInt(versionString, 10);

  console.log('AI Availability Check:', {
    platform: Platform.OS,
    versionString,
    iosVersion,
    meetsRequirement: iosVersion >= 26,
  });

  if (iosVersion < 26) {
    console.log(`AI unavailable: iOS ${iosVersion} < 26`);
    return false;
  }

  console.log('AI availability check: iOS version supported');
  return true;
};

/**
 * Generate a placeholder starter for a Kolb step
 * 
 * Creates a brief (3-6 word) contextual starter phrase to help users
 * begin their reflection. Example: "I focused on..." or "The main challenge was..."
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