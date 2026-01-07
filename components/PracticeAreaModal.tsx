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
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { PracticeArea, PracticeAreaType } from "../utils";
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

  // Practice area type definitions
  const practiceAreaTypes = [
    {
      value: 'solo_skill',
      label: 'Solo Skill',
      description: 'Technical practice, measurable progress'
    },
    {
      value: 'performance',
      label: 'Performance',
      description: 'Execution under pressure, audience awareness'
    },
    {
      value: 'interpersonal',
      label: 'Interpersonal',
      description: 'Communication, emotional dynamics'
    },
    {
      value: 'creative',
      label: 'Creative',
      description: 'Exploration, experimentation, non-linear discovery'
    },
  ];

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
            <Text style={styles.modalTitle}>{!selectedPracticeArea?.id ? 'New' : 'Edit'} Practice Area
            </Text>
            {
              selectedPracticeArea?.id &&
              <TouchableOpacity style={styles.iconOnlyDelete} onPress={() => onDelete(selectedPracticeArea.id)}>
                {/* <Text style={styles.deleteIcon}>🗑️</Text> */}
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                // color={styles.deleteIcon.color}
                />
              </TouchableOpacity>
            }
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
              style={styles.pickerButton}
              onPress={() => setPickerOpen(true)}
              disabled={isLoading}
            >
              <View style={styles.pickerButtonContent}>
                <View style={styles.pickerButtonTextContainer}>
                  <Text style={styles.pickerButtonLabel}>
                    {practiceAreaTypes.find(t => t.value === type)?.label}
                  </Text>
                  <Text style={styles.pickerButtonDescription} numberOfLines={1}>
                    {practiceAreaTypes.find(t => t.value === type)?.description}
                  </Text>
                </View>
                <Text style={styles.pickerChevron}>▼</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
          </View>ı
        </View>
      </View>

      <PracticeAreaTypePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select Practice Area Type"
        options={practiceAreaTypes}
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
    marginBottom: SPACING.lg,
    textAlign: 'center',
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
  iconOnlyDelete: {

    // padding: 12,
    // borderRadius: 8,
    // backgroundColor: '#FEE2E2',
    // borderWidth: 1,
    // borderColor: '#FECACA',
  },
  deleteIcon: {
    fontSize: 20,
    color: '#DC2626', // Red destructive
  },
  cancelButton: {
    backgroundColor: COLORS.neutral[200],
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
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

