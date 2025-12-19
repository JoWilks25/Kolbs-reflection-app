import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Text,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';
import { useAppStore } from '../stores/appStore';
import { PracticeAreaWithStats, PendingReflection } from '../utils/types';
import { getPracticeAreas, createPracticeArea, checkPracticeAreaNameExists, getPendingReflections, insertTestPendingReflections } from "../db/queries";
import { getDatabase } from "../db/migrations";
import PendingReflectionsBanner from "../components/PendingReflectionsBanner";
import PracticeAreaItem from "../components/PracticeAreaItem";
import EmptyState from "../components/EmptyState";
import CreatePracticeAreaModal from "../components/CreatePracticeAreaModal";
import SecurityWarningBanner from "../components/SecurityWarningBanner";
import { checkDeviceSecurity } from "../services/securityService";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

type Props = {
  navigation: HomeScreenNavigationProp;
};


const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // Get state from store
  const practiceAreas = useAppStore((state) => state.practiceAreas) as PracticeAreaWithStats[];
  const setPracticeAreas = useAppStore(state => state.setPracticeAreas);
  const setPendingReflectionsCount = useAppStore(state => state.setPendingReflectionsCount);
  const showSecurityWarning = useAppStore(state => state.showSecurityWarning);
  const setShowSecurityWarning = useAppStore(state => state.setShowSecurityWarning);

  // Pull-to-refresh state (user will manage this)
  const [refreshing, setRefreshing] = useState(false);

  // Loading state placeholder (user will manage this)
  const [isLoading, setIsLoading] = useState(false);

  // Create modal state
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Pending reflections state
  const [pendingReflections, setPendingReflections] = useState<PendingReflection[]>([]);

  const loadPracticeAreas = async () => {
    setIsLoading(true);
    try {
      const practiceAreas: PracticeAreaWithStats[] = await getPracticeAreas();
      setPracticeAreas(practiceAreas);
    } catch (error) {
      console.error('Error loading practice areas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPendingReflections = async () => {
    try {
      const pending = await getPendingReflections();
      setPendingReflections(pending as PendingReflection[]);
      setPendingReflectionsCount(pending.length);
    } catch (error) {
      console.error('Error loading pending reflections:', error);
    }
  };

  const checkAndShowSecurityWarning = async () => {
    try {
      const isSecure = await checkDeviceSecurity();
      console.log('isSecure', isSecure)
      if (!isSecure) {
        setShowSecurityWarning(true);
      }
    } catch (error) {
      console.error('Error checking device security:', error);
      // Don't show warning if check fails
    }
  };

  // In HomeScreen or a dev screen
  const handleReset = async () => {
    const db = getDatabase();
    await db.runAsync('DELETE FROM practice_areas');
    await db.runAsync('DELETE FROM sessions');
    await db.runAsync('DELETE FROM reflections');
    await loadPracticeAreas(); // Refresh the list
    Alert.alert('Reset', 'Practice Areas table cleared');
  };

  // Uncomment and modify
  const handleInsertTestData = async () => {
    try {
      await insertTestPendingReflections();
      await loadPracticeAreas();
      await loadPendingReflections();
      Alert.alert('Test Data', 'Test pending reflections data inserted');
    } catch (error) {
      console.error('Error inserting test data:', error);
      Alert.alert('Error', 'Failed to insert test data');
    }
  };

  useEffect(() => {
    // handleReset();
    // handleInsertTestData();
    checkAndShowSecurityWarning();
    loadPendingReflections();
    loadPracticeAreas();
  }, []);

  // Reload pending reflections when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadPendingReflections();
    }, [])
  );

  // Refresh handler placeholder - user will implement
  const handleRefresh = async () => {
    setRefreshing(true);
    // User will implement data loading here
    await loadPendingReflections();
    await loadPracticeAreas();
    setRefreshing(false);
  };

  // Navigation handler
  const handlePracticeAreaPress = (practiceAreaId: string) => {
    navigation.navigate("SessionSetup", { practiceAreaId });
  };

  // Handle pending reflection banner press
  const handlePendingBannerPress = () => {
    if (pendingReflections.length > 0) {
      const oldest = pendingReflections[0];
      navigation.navigate("SeriesTimeline", {
        practiceAreaId: oldest.practice_area_id,
        focusSessionId: oldest.id,
      });
    }
  };

  // Security warning handler
  const handleDismissSecurityWarning = () => {
    setShowSecurityWarning(false);
  };

  // Modal handlers
  const openCreateModal = () => {
    setIsCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
  };

  const handleCreatePracticeArea = async (name: string) => {
    setIsCreating(true);
    try {
      // Check for duplicate name
      const nameExists = await checkPracticeAreaNameExists(name);
      if (nameExists) {
        throw new Error("A Practice Area with this name already exists");
      }

      await createPracticeArea(name);
      closeCreateModal();
      await loadPracticeAreas();
      Alert.alert("Success", "Practice Area created");
    } catch (error: any) {
      console.error("Error creating practice area:", error);
      const errorMessage = error.message || "Failed to create Practice Area. Please try again.";
      Alert.alert("Error", errorMessage);
      throw error; // Re-throw so modal can handle it
    } finally {
      setIsCreating(false);
    }
  };

  // Loading State
  if (isLoading && practiceAreas.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Security Warning Banner */}
      {showSecurityWarning && (
        <SecurityWarningBanner onDismiss={handleDismissSecurityWarning} />
      )}

      {/* Pending Reflections Banner */}
      <PendingReflectionsBanner
        pendingReflections={pendingReflections}
        onPress={handlePendingBannerPress}
      />

      <FlatList
        data={practiceAreas}
        renderItem={({ item }) => (
          <PracticeAreaItem item={item} onPress={handlePracticeAreaPress} />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          practiceAreas.length === 0 ? styles.emptyListContainer : styles.listContainer
        }
        ListEmptyComponent={<EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

      {/* New Practice Area Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.newPracticeAreaButton}
          onPress={openCreateModal}
          activeOpacity={0.8}
        >
          <Text style={styles.newPracticeAreaButtonText}>New Practice Area</Text>
        </TouchableOpacity>
      </View>

      {/* Create Practice Area Modal */}
      <CreatePracticeAreaModal
        visible={isCreateModalVisible}
        onClose={closeCreateModal}
        onSubmit={handleCreatePracticeArea}
        isCreating={isCreating}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  listContainer: {
    padding: SPACING.md,
  },
  emptyListContainer: {
    flex: 1,
  },
  // New Practice Area Button
  buttonContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  newPracticeAreaButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  newPracticeAreaButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.inverse,
  },
});

export default HomeScreen;
