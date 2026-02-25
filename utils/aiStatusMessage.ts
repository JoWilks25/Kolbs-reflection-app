export const AI_COACHING_STATUS_MESSAGES = {
  available: "AI coaching is available on this device.",
  unavailable:
    "AI coaching unavailable on this device. You can still use all reflection features manually.",
} as const;

export const getAICoachingStatusMessage = (aiAvailable: boolean): string => {
  return aiAvailable
    ? AI_COACHING_STATUS_MESSAGES.available
    : AI_COACHING_STATUS_MESSAGES.unavailable;
};
