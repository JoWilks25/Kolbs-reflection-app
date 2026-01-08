/**
 * useAICoaching Hook
 * 
 * React hook for integrating AI coaching features into reflection components.
 * Handles question generation, follow-up questions, and metric tracking.
 * 
 * Usage:
 * ```typescript
 * const { stepQuestion, followup, isLoadingQuestion, checkForFollowup, aiActive } = useAICoaching(step);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import {
  generateStepQuestion,
  getStaticPromptForTone,
  generateFollowup,
  type AIContext,
} from '../services/aiService';

interface UseAICoachingOptions {
  /** Previous session's step 4 answer for context */
  previousStep4Answer?: string | null;
}

interface UseAICoachingResult {
  /** Generated step question (AI-generated or static fallback) */
  stepQuestion: string | null;
  /** Generated follow-up question */
  followup: string | null;
  /** Loading state for AI question generation */
  isLoadingQuestion: boolean;
  /** Check if follow-up should be shown based on answer length */
  checkForFollowup: (userAnswer: string) => Promise<void>;
  /** Track when user answers a follow-up */
  markFollowupAnswered: () => void;
  /** Whether AI is currently active (available AND enabled AND aiAssisted) */
  aiActive: boolean;
}

/**
 * Hook for AI coaching features in reflection prompts
 * 
 * @param step - Current Kolb step (2, 3, or 4)
 * @param options - Optional configuration including previous session's step 4 answer
 * @returns AI coaching state and functions
 */
export const useAICoaching = (
  step: 2 | 3 | 4,
  options: UseAICoachingOptions = {},
): UseAICoachingResult => {
  const { previousStep4Answer = null } = options;

  // Get state from Zustand store
  const currentPracticeArea = useAppStore((state) => state.currentPracticeArea);
  const currentSession = useAppStore((state) => state.currentSession);
  const reflectionDraft = useAppStore((state) => state.reflectionDraft);
  const aiAvailable = useAppStore((state) => state.aiAvailable);
  const aiEnabled = useAppStore((state) => state.aiEnabled);
  const incrementAiMetric = useAppStore((state) => state.incrementAiMetric);
  const updateReflectionDraft = useAppStore((state) => state.updateReflectionDraft);

  // Local state
  const [stepQuestion, setStepQuestion] = useState<string | null>(null);
  const [followup, setFollowup] = useState<string | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);

  // Determine if AI is active for this reflection
  const aiActive = aiAvailable && aiEnabled && reflectionDraft.aiAssisted;

  /**
   * Build context object for AI generation
   */
  const buildContext = useCallback((): AIContext | null => {
    console.log({ currentPracticeArea, currentSession, reflectionDraft })
    if (!currentPracticeArea || !currentSession || !reflectionDraft.coachingTone) {
      return null;
    }

    return {
      practiceAreaName: currentPracticeArea.name,
      practiceAreaType: currentPracticeArea.type,
      sessionIntent: currentSession.intent,
      previousStep4Answer,
      coachingTone: reflectionDraft.coachingTone,
      currentStepAnswers: {
        step2: reflectionDraft.step2,
        step3: reflectionDraft.step3,
      },
    };
  }, [currentPracticeArea, currentSession, reflectionDraft, previousStep4Answer]);

  /**
   * Generate context-specific question when step changes
   */
  useEffect(() => {
    const fetchQuestion = async () => {
      // console.log('reflectionDraft', reflectionDraft)
      if (!reflectionDraft.coachingTone) {
        setStepQuestion(null);
        return;
      }

      // Use static prompt when AI disabled or unavailable
      console.log('aiActive', aiActive)
      if (!aiActive) {
        const staticPrompt = getStaticPromptForTone(reflectionDraft.coachingTone, step);
        setStepQuestion(staticPrompt);
        // Store null for question field (static prompt was used)
        if (step === 2) {
          updateReflectionDraft('step2Question', null);
        } else if (step === 3) {
          updateReflectionDraft('step3Question', null);
        } else {
          updateReflectionDraft('step4Question', null);
        }
        return;
      }

      setIsLoadingQuestion(true);
      const context = buildContext();
      console.log('context', context)
      if (!context) {
        setIsLoadingQuestion(false);
        return;
      }

      try {
        const question = await generateStepQuestion(context, step);

        // Fallback to static if AI fails
        const finalQuestion = question || getStaticPromptForTone(context.coachingTone, step);
        setStepQuestion(finalQuestion);

        // Track that AI question was shown (if AI succeeded)
        if (question) {
          incrementAiMetric('aiQuestionsShown');
          // Store the generated question text
          if (step === 2) {
            updateReflectionDraft('step2Question', question);
          } else if (step === 3) {
            updateReflectionDraft('step3Question', question);
          } else {
            updateReflectionDraft('step4Question', question);
          }
        } else {
          // Store null when using static fallback
          if (step === 2) {
            updateReflectionDraft('step2Question', null);
          } else if (step === 3) {
            updateReflectionDraft('step3Question', null);
          } else {
            updateReflectionDraft('step4Question', null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch question:', error);
        const staticPrompt = getStaticPromptForTone(reflectionDraft.coachingTone!, step);
        setStepQuestion(staticPrompt);
        if (step === 2) {
          updateReflectionDraft('step2Question', null);
        } else if (step === 3) {
          updateReflectionDraft('step3Question', null);
        } else {
          updateReflectionDraft('step4Question', null);
        }
      } finally {
        setIsLoadingQuestion(false);
      }
    };

    fetchQuestion();
    // Only regenerate when step changes or AI becomes active
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, aiActive, reflectionDraft.coachingTone]);

  /**
   * Check if a follow-up question should be generated based on answer length
   */
  const checkForFollowup = useCallback(async (userAnswer: string) => {
    // Clear existing follow-up
    setFollowup(null);

    if (!aiActive) {
      return;
    }

    // Only show follow-up for brief answers (< 50 chars)
    if (userAnswer.length >= 50 || userAnswer.length === 0) {
      return;
    }

    const context = buildContext();
    if (!context) return;

    try {
      const result = await generateFollowup(context, step, userAnswer);
      setFollowup(result);

      if (result) {
        incrementAiMetric('aiFollowupsShown');
      }
    } catch (error) {
      console.error('Failed to fetch follow-up:', error);
      setFollowup(null);
    }
  }, [aiActive, buildContext, step, incrementAiMetric]);

  /**
   * Track when user answers a follow-up question
   */
  const markFollowupAnswered = useCallback(() => {
    if (followup) {
      incrementAiMetric('aiFollowupsAnswered');
      setFollowup(null); // Clear after answered
    }
  }, [followup, incrementAiMetric]);

  return {
    stepQuestion,
    followup,
    isLoadingQuestion,
    checkForFollowup,
    markFollowupAnswered,
    aiActive,
  };
};

