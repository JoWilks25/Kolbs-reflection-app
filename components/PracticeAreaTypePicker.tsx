import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, TYPE_BADGE_CONFIG } from '../utils/constants';

interface PickerOption {
  value: string;
  label: string;
  description: string;
}

export interface PracticeAreaTypePickerProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: PickerOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

const PracticeAreaTypePicker: React.FC<PracticeAreaTypePickerProps> = ({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.pickerModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.pickerModalContent}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.closeIconButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={COLORS.text.secondary}
              />
            </TouchableOpacity>
          </View>
          {options.map((item) => {
            const typeConfig = TYPE_BADGE_CONFIG[item.value as keyof typeof TYPE_BADGE_CONFIG];
            const isSelected = selectedValue === item.value;

            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.pickerOption,
                  isSelected && typeConfig && {
                    backgroundColor: typeConfig.backgroundColor,
                    borderColor: typeConfig.color,
                  },
                  isSelected && !typeConfig && styles.pickerOptionSelected,
                ]}
                onPress={() => onSelect(item.value)}
              >
                {typeConfig && (
                  <View style={styles.pickerOptionIcon}>
                    <MaterialCommunityIcons
                      name={typeConfig.iconName}
                      size={20}
                      color={isSelected ? typeConfig.color : COLORS.text.secondary}
                    />
                  </View>
                )}
                <View style={styles.pickerOptionContent}>
                  <Text style={[
                    styles.pickerOptionLabel,
                    isSelected && styles.pickerOptionLabelSelected,
                    isSelected && typeConfig && { color: typeConfig.color },
                  ]}>
                    {item.label}
                  </Text>
                  <Text style={[
                    styles.pickerOptionDescription,
                    isSelected && styles.pickerOptionDescriptionSelected,
                  ]}>
                    {item.description}
                  </Text>
                </View>
                {isSelected && (
                  <Text style={[
                    styles.pickerCheckmark,
                    typeConfig && { color: typeConfig.color },
                  ]}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  pickerModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  pickerModalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
  },
  closeIconButton: {
    padding: SPACING.xs,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(90, 159, 212, 0.15)', // 15% opacity of primary color
    borderColor: COLORS.primary,
  },
  pickerOptionIcon: {
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  pickerOptionLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs / 2,
  },
  pickerOptionLabelSelected: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  pickerOptionDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    lineHeight: TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal,
  },
  pickerOptionDescriptionSelected: {
    color: COLORS.text.primary,
  },
  pickerCheckmark: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default PracticeAreaTypePicker;

