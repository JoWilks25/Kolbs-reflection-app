import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, TYPE_BADGE_CONFIG } from "../utils/constants";
import { PracticeArea, PracticeAreaType, PRACTICE_AREA_TYPES } from "../utils";
import PracticeAreaTypePicker from "./PracticeAreaTypePicker";

export interface PracticeAreaModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string, type: PracticeAreaType) => Promise<void>;
  onEdit: (editedName: string, id: string, type: PracticeAreaType) => Promise<void>;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  selectedPracticeArea?: PracticeArea;
}

const PracticeAreaModal: React.FC<PracticeAreaModalProps> = ({
  visible,
  onClose,
  onCreate,
  onEdit,
  onDelete,
  isLoading = false,
  selectedPracticeArea,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [type, setType] = useState<PracticeAreaType>('solo_skill');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setName("");
      setError("");
      setType('solo_skill');
      setPickerOpen(false);
    }
  }, [visible]);

  useEffect(() => {
    if (selectedPracticeArea) {
      setName(selectedPracticeArea.name);
      setType(selectedPracticeArea.type)
    }
  }, [selectedPracticeArea?.name])

  const validateName = (nameToValidate: string): boolean => {
    const trimmedName = nameToValidate.trim();
    if (trimmedName.length === 0) {
      setError("Please enter a name");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();

    if (trimmedName === selectedPracticeArea?.name && type === selectedPracticeArea.type) {
      Alert.alert("No changes made to name or type")
      return;
    }

    if (!validateName(trimmedName)) {
      return;
    }

    try {
      if (selectedPracticeArea?.id) {
        await onEdit(trimmedName, selectedPracticeArea.id, type)
      } else {
        await onCreate(trimmedName, type);
      }
      // If successful, the parent will close the modal
    } catch (error: any) {
      // Display error from parent (e.g., duplicate name)
      if (error?.message) {
        setError(error.message);
      }
      console.error("Error in modal submit:", error);
    }
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{!selectedPracticeArea?.id ? 'New' : 'Edit'} Practice Area</Text>
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
          <TextInput
            style={styles.input}
            placeholder="Practice Area name"
            placeholderTextColor={COLORS.text.disabled}
            value={name}
            onChangeText={setName}
            maxLength={100}
            autoFocus={true}
            editable={!isLoading}
          />

          <View style={styles.characterCountContainer}>
            <Text style={styles.characterCount}>{name.length}/100</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>Practice Area Type</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                TYPE_BADGE_CONFIG[type] && {
                  backgroundColor: TYPE_BADGE_CONFIG[type].backgroundColor,
                  borderColor: TYPE_BADGE_CONFIG[type].color,
                },
              ]}
              onPress={() => setPickerOpen(true)}
              disabled={isLoading}
            >
              <View style={styles.pickerButtonContent}>
                {TYPE_BADGE_CONFIG[type] && (
                  <View style={styles.pickerButtonIcon}>
                    <MaterialCommunityIcons
                      name={TYPE_BADGE_CONFIG[type].iconName}
                      size={20}
                      color={TYPE_BADGE_CONFIG[type].color}
                    />
                  </View>
                )}
                <View style={styles.pickerButtonTextContainer}>
                  <Text style={[
                    styles.pickerButtonLabel,
                    TYPE_BADGE_CONFIG[type] && { color: TYPE_BADGE_CONFIG[type].color },
                  ]}>
                    {PRACTICE_AREA_TYPES.find(t => t.value === type)?.label}
                  </Text>
                  <Text style={styles.pickerButtonDescription} numberOfLines={1}>
                    {PRACTICE_AREA_TYPES.find(t => t.value === type)?.description}
                  </Text>
                </View>
                <Text style={[
                  styles.pickerChevron,
                  TYPE_BADGE_CONFIG[type] && { color: TYPE_BADGE_CONFIG[type].color },
                ]}>▼</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.modalButtons}>
            {selectedPracticeArea?.id && (
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.updateButtonText}>
                  {isLoading ? "Updating..." : "Update"}
                </Text>
              </TouchableOpacity>
            )}
            {selectedPracticeArea?.id && (
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => {
                  Alert.alert(
                    "Delete Practice Area",
                    `Are you sure you want to delete "${selectedPracticeArea.name}"? This action cannot be undone.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => onDelete(selectedPracticeArea.id),
                      },
                    ]
                  );
                }}
                disabled={isLoading}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}
            {!selectedPracticeArea?.id && (
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createButton,
                  isLoading && styles.createButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                <Text style={styles.createButtonText}>
                  {isLoading ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <PracticeAreaTypePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select Practice Area Type"
        options={PRACTICE_AREA_TYPES}
        selectedValue={type}
        onSelect={(value) => {
          setType(value as PracticeAreaType);
          setPickerOpen(false);
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    flex: 1,
  },
  closeIconButton: {
    padding: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
  },
  characterCountContainer: {
    alignItems: 'flex-end',
    marginTop: SPACING.xs,
  },
  characterCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButton: {
    backgroundColor: COLORS.primary,
  },
  updateButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  createButton: {
    backgroundColor: COLORS.primary,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.neutral[300],
  },
  createButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
  pickerSection: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  pickerLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  pickerButton: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral[300],
    padding: SPACING.md,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonIcon: {
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerButtonTextContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  pickerButtonLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs / 2,
  },
  pickerButtonDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
  pickerChevron: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
  },
});

export default PracticeAreaModal;

