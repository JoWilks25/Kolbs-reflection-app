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
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { PracticeArea } from "../utils";

export interface PracticeAreaModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onEdit: (editedName: string, id: string) => Promise<void>;
  isCreating?: boolean;
  selectedPracticeArea?: PracticeArea;
}

const PracticeAreaModal: React.FC<PracticeAreaModalProps> = ({
  visible,
  onClose,
  onCreate,
  onEdit,
  isCreating = false,
  selectedPracticeArea,
}) => {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setName("");
      setError("");
    }
  }, [visible]);

  useEffect(() => {
    if (selectedPracticeArea) {
      setName(selectedPracticeArea.name);
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

    if (trimmedName === selectedPracticeArea?.name) {
      Alert.alert("No changes made to name")
      return;
    }

    if (!validateName(trimmedName)) {
      return;
    }

    try {
      if (selectedPracticeArea?.id) {
        await onEdit(trimmedName, selectedPracticeArea.id)
      } else {
        await onCreate(trimmedName);
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
          <Text style={styles.modalTitle}>{!selectedPracticeArea?.id ? 'New' : 'Edit'} Practice Area</Text>

          <TextInput
            style={styles.input}
            placeholder="Practice Area name"
            placeholderTextColor={COLORS.text.disabled}
            value={name}
            onChangeText={setName}
            maxLength={100}
            autoFocus={true}
            editable={!isCreating}
          />

          <View style={styles.characterCountContainer}>
            <Text style={styles.characterCount}>{name.length}/100</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.createButton,
                isCreating && styles.createButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isCreating}
            >
              <Text style={styles.createButtonText}>
                {isCreating ? "Creating..." : "Create"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
});

export default PracticeAreaModal;

