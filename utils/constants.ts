export const COLORS = {
  // Softer, more calming than current bright blue
  primary: '#5A9FD4',      // Softer ocean blue (vs current #4A90E2)
  secondary: '#7BA3CC',    // Muted sky blue (vs current purple #7B68EE)

  background: '#FAFBFC',   // Slightly off-white (less harsh than pure white)
  surface: '#F0F4F8',      // Soft blue-gray tint

  text: {
    primary: '#2C3E50',    // Softer than pure black, easier on eyes
    secondary: '#6B7C93',  // Blue-tinted gray
    disabled: '#B8C5D6',
    inverse: '#FFFFFF',
  },

  // Status colors (keep current - they work well)
  info: '#2C3E50',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',

  // Neutral scale with blue undertones
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
} as const;


const BASE_UNIT = 8;
export const SPACING = {
  base: BASE_UNIT,
  xs: BASE_UNIT * 0.5,    // 0.5 * base
  sm: BASE_UNIT * 1,    // 1 * base
  md: BASE_UNIT * 2,   // 2 * base
  lg: BASE_UNIT * 3,   // 3 * base
  xl: BASE_UNIT * 4,   // 4 * base
  xxl: BASE_UNIT * 6,  // 6 * base
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
} as const;

export const APP_CONSTANTS = {
  MAX_REFLECTION_CHARS: 3000,
  DEADLINE_THRESHOLDS: {
    HOURS_24: 24 * 60 * 60 * 1000,  // 24 hours in milliseconds
    HOURS_48: 48 * 60 * 60 * 1000,  // 48 hours in milliseconds
  },
  EDIT_WINDOW_48H: 48 * 60 * 60 * 1000, // 48h in ms - reflection edit window
} as const;

// Tone-adapted base prompts for reflection steps
// Keys: 1 = Facilitative, 2 = Socratic, 3 = Supportive
export const TONE_PROMPTS: Record<1 | 2 | 3, { step2: string; step3: string; step4: string }> = {
  1: { // Facilitative - Guided Discovery
    // Self-directed, exploratory, open-ended
    step2: "Walk me through what happened during this practice. What steps did you take?",
    step3: "What are you noticing about yourself or your approach? What's emerging for you?",
    step4: "What do you feel ready to explore or try next time?",
  },
  2: { // Socratic - Structured Inquiry
    // Systematic, evidence-based, analytical
    step2: "What actually happened, step by step? Describe the sequence of actions you took.",
    step3: "Looking back, what patterns are you seeing? What assumptions did you start with?",
    step4: "What specific change will you test in your next session?",
  },
  3: { // Supportive - Encouraging
    // Warm, normalizing, confidence-building
    step2: "You practiced—that's great! What happened during this session? Walk me through your steps.",
    step3: "What's the main thing you're taking away from this? What felt like progress?",
    step4: "What's one small thing you'll focus on next time?",
  },
} as const;

// Coaching tone card data for ReflectionToneScreen
export const COACHING_TONE_CARDS = [
  {
    tone: 1 as const,
    icon: "🧭",
    title: "Facilitative",
    subtitle: "Guided Discovery",
    description: "Explore your own insights through open questions",
    bestFor: "Self-directed reflection",
  },
  {
    tone: 2 as const,
    icon: "🔍",
    title: "Socratic",
    subtitle: "Structured Inquiry",
    description: "Challenge assumptions with purposeful questioning",
    bestFor: "Deep analysis and pattern-spotting",
  },
  {
    tone: 3 as const,
    icon: "💪",
    title: "Supportive",
    subtitle: "Encouraging",
    description: "Build confidence with empathy and encouragement",
    bestFor: "Tough sessions or low energy",
  },
] as const;

// Target duration presets (in seconds)
export const TARGET_DURATION_PRESETS = [
  { label: '15 min', seconds: 15 * 60 },
  { label: '30 min', seconds: 30 * 60 },
  { label: '45 min', seconds: 45 * 60 },
  { label: '60 min', seconds: 60 * 60 },
];

// Practice Area Type Badge Configuration
// UI styling configuration for practice area types (icons, colors, labels)
export const TYPE_BADGE_CONFIG = {
  solo_skill: {
    label: 'Solo',
    color: '#7E57C2',  // Purple - precision, focus
    backgroundColor: 'rgba(126, 87, 194, 0.15)',  // 15% opacity
    iconName: 'target' as const,
    emoji: '🎯',
  },
  performance: {
    label: 'Performance',
    color: '#EC407A',  // Pink - energy, boldness
    backgroundColor: 'rgba(236, 64, 122, 0.15)',  // 15% opacity
    iconName: 'lightning-bolt' as const,
    emoji: '🎭',
  },
  interpersonal: {
    label: 'Interpersonal',
    color: '#26A69A',  // Teal - communication, connection
    backgroundColor: 'rgba(38, 166, 154, 0.15)',  // 15% opacity
    iconName: 'account-group-outline' as const,
    emoji: '👥',
  },
  creative: {
    label: 'Creative',
    color: '#9C27B0',  // Deep purple - imagination, creativity
    backgroundColor: 'rgba(156, 39, 176, 0.15)',  // 15% opacity
    iconName: 'lightbulb-outline' as const,
    emoji: '🎨',
  },
} as const;

// Export a complete theme object for convenience
export const THEME = {
  colors: COLORS,
  spacing: SPACING,
  typography: TYPOGRAPHY,
  app: APP_CONSTANTS,
} as const;