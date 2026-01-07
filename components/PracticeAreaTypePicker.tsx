import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';

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
          <Text style={styles.pickerModalTitle}>{title}</Text>
          {options.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.pickerOption,
                selectedValue === item.value && styles.pickerOptionSelected,
              ]}
              onPress={() => onSelect(item.value)}
            >
              <View style={styles.pickerOptionContent}>
                <Text style={[
                  styles.pickerOptionLabel,
                  selectedValue === item.value && styles.pickerOptionLabelSelected,
                ]}>
                  {item.label}
                </Text>
                <Text style={[
                  styles.pickerOptionDescription,
                  selectedValue === item.value && styles.pickerOptionDescriptionSelected,
                ]}>
                  {item.description}
                </Text>
              </View>
              {selectedValue === item.value && (
                <Text style={styles.pickerCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
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
  pickerModalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
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

