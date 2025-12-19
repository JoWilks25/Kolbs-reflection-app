import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/constants';
import { useAppStore } from '../stores/appStore';
import { PracticeAreaWithStats } from '../utils/types';
import { formatDate } from '../utils/timeFormatting';
import { getPracticeAreas } from "../db/queries";

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

type Props = {
  navigation: HomeScreenNavigationProp;
};

// Format session count with proper pluralization
const formatSessionCount = (count: number): string => {
  return count === 1 ? "1 session" : `${count} sessions`;
};

// Practice Area Item Component
type PracticeAreaItemProps = {
  item: PracticeAreaWithStats;
  onPress: (practiceAreaId: string) => void;
};

const PracticeAreaItem: React.FC<PracticeAreaItemProps> = ({ item, onPress }) => {
  const lastSessionText = item.lastSessionDate
    ? formatDate(item.lastSessionDate)
    : "No sessions yet";

  return (
    <TouchableOpacity
      style={styles.practiceAreaItem}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.itemContent}>
        <Text style={styles.practiceAreaName}>{item.name}</Text>
        <Text style={styles.lastSessionDate}>{lastSessionText}</Text>
        <View style={styles.sessionCountBadge}>
          <Text style={styles.sessionCountText}>
            {formatSessionCount(item.sessionCount)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Empty State Component
const EmptyState: React.FC = () => (
  <View style={styles.emptyStateContainer}>
    <Text style={styles.emptyStateTitle}>No Practice Areas yet</Text>
    <Text style={styles.emptyStateBody}>
      Create a Practice Area to start tracking your practice sessions.
    </Text>
  </View>
);

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // Get state from store
  const practiceAreas = useAppStore((state) => state.practiceAreas) as PracticeAreaWithStats[];
  const setPracticeAreas = useAppStore(state => state.setPracticeAreas);

  // Pull-to-refresh state (user will manage this)
  const [refreshing, setRefreshing] = useState(false);

  // Loading state placeholder (user will manage this)
  const [isLoading, setIsLoading] = useState(false);

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
  }

  useEffect(() => {
    loadPracticeAreas();
  }, []);

  // Refresh handler placeholder - user will implement
  const handleRefresh = async () => {
    setRefreshing(true);
    // User will implement data loading here
    await loadPracticeAreas();
    setRefreshing(false);
  };

  // Navigation handler
  const handlePracticeAreaPress = (practiceAreaId: string) => {
    navigation.navigate("SessionSetup", { practiceAreaId });
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
  practiceAreaItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    gap: SPACING.xs,
  },
  practiceAreaName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  lastSessionDate: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  sessionCountBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    marginTop: SPACING.xs,
  },
  sessionCountText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.inverse,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.fontSize.md * TYPOGRAPHY.lineHeight.normal,
  },
});

export default HomeScreen;
