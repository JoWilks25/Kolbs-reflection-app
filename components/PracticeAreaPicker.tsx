import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";
import { useAppStore } from "../stores/appStore";
import { PracticeAreaWithStats } from "../utils/types";

export interface PracticeAreaPickerProps {
  visible: boolean;
  currentPracticeAreaId: string;
  onSelect: (practiceAreaId: string) => void;
  onClose: () => void;
}

const PracticeAreaPicker: React.FC<PracticeAreaPickerProps> = ({
  visible,
  currentPracticeAreaId,
  onSelect,
  onClose,
}) => {
  const practiceAreas = useAppStore((state) => state.practiceAreas);

  // Filter out the current practice area
  const availablePracticeAreas = practiceAreas.filter(
    (pa) => pa.id !== currentPracticeAreaId
  );

  const handleSelect = (practiceAreaId: string) => {
    onSelect(practiceAreaId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Practice Area</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Practice Areas List */}
          {availablePracticeAreas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No other practice areas available
              </Text>
            </View>
          ) : (
            <FlatList
              data={availablePracticeAreas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.practiceAreaItem}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.practiceAreaName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* Cancel Button */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[200],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  closeButtonText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.text.secondary,
  },
  listContent: {
    padding: SPACING.md,
  },
  practiceAreaItem: {
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.neutral[200],
  },
  practiceAreaName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: "center",
  },
  actionContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[200],
  },
  actionButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: COLORS.neutral[200],
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.primary,
  },
});

export default PracticeAreaPicker;

