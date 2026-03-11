import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, TYPE_BADGE_CONFIG } from '../utils/constants';
import { PRACTICE_AREA_TYPES } from '../utils/types';

interface FirstRunCoachProps {
  onOpenModal: () => void;
}

const FirstRunCoach: React.FC<FirstRunCoachProps> = ({ onOpenModal }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  const toggleExamples = (typeValue: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeValue)) {
        next.delete(typeValue);
      } else {
        next.add(typeValue);
      }
      return next;
    });
  };

  const handleNext = () => {
    if (currentStep < 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderCard1 = () => (
    <>
      <Text style={styles.title}>Track one skill at a time</Text>
      <Text style={styles.body}>
        A Practice Area is a single skill you're actively working to
        improve. Each time you practice, you log a session and over
        time, those sessions form a connected series that shows your
        progress.
      </Text>
      <Text style={styles.body}>
        Think of it like a training log, but for any skill.
      </Text>
    </>
  );

  const renderCard2 = () => (
    <>
      <Text style={styles.title}>Pick the type that fits</Text>
      <Text style={styles.body}>
        The type you choose shapes how the AI coaches you after each session.
      </Text>
      <View style={styles.typesContainer}>
        {PRACTICE_AREA_TYPES.map((type) => {
          const typeConfig = TYPE_BADGE_CONFIG[type.value];
          const isExpanded = expandedTypes.has(type.value);
          const examples = type.examples;

          return (
            <View key={type.value} style={styles.typeRow}>
              <View style={[styles.typeIconContainer, { backgroundColor: typeConfig.backgroundColor }]}>
                <MaterialCommunityIcons
                  name={typeConfig.iconName}
                  size={20}
                  color={typeConfig.color}
                />
              </View>
              <View style={styles.typeContent}>
                <Text style={styles.typeLabel}>{type.label}</Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
                {examples.length > 0 && (
                  <>
                    <TouchableOpacity
                      onPress={() => toggleExamples(type.value)}
                      style={styles.examplesToggle}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.examplesToggleText}>
                        {isExpanded ? 'Hide examples' : 'Show examples'}
                      </Text>
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={COLORS.text.secondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.examplesList}>
                        {examples.map((example, index) => (
                          <Text key={index} style={styles.exampleItem}>
                            • {example}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Progress Indicator (fixed) */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            {[0, 1].map((index) => (
              <View
                key={index}
                style={[
                  styles.progressBarSegment,
                  index <= currentStep && styles.progressBarSegmentActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Card Content (scrollable) */}
        <ScrollView
          style={styles.scrollableContent}
          contentContainerStyle={styles.scrollableContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 0 ? renderCard1() : renderCard2()}
        </ScrollView>

        {/* Navigation (fixed) */}
        <View style={styles.navigation}>
          {currentStep === 0 ? (
            <>
              <TouchableOpacity
                onPress={onOpenModal}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip intro</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNext}
                style={styles.primaryButton}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>Next →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleBack}
                style={styles.secondaryButton}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onOpenModal}
                style={styles.primaryButton}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>Let's Go →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    maxWidth: 600,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressSection: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  progressBarContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.neutral[200],
    borderRadius: 2,
  },
  progressBarSegmentActive: {
    backgroundColor: COLORS.primary,
  },
  scrollableContent: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  scrollableContentContainer: {
    paddingBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    lineHeight: TYPOGRAPHY.fontSize.xl * TYPOGRAPHY.lineHeight.normal,
  },
  body: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.relaxed,
    marginBottom: SPACING.md,
  },
  typesContainer: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeContent: {
    flex: 1,
  },
  typeLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  typeDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
  navigation: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  skipButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  skipButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    borderRadius: 10,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  examplesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  examplesToggleText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textDecorationLine: 'underline',
    marginRight: SPACING.xs,
  },
  examplesList: {
    marginTop: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  exampleItem: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
});

export default FirstRunCoach;
