import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppStore } from "../stores/appStore";

const ReflectionFeedbackScreen: React.FC = () => {
  const { clearLastEndedSession } = useAppStore();

  // TODO: When implementing the save reflection logic, call clearLastEndedSession() after successful save
  // Example:
  // const handleFinish = async () => {
  //   try {
  //     await db.runAsync('INSERT INTO reflections ...', [/* values */]);
  //     clearReflectionDraft();
  //     clearLastEndedSession(); // Clear session context after save
  //     navigation.navigate('SeriesTimeline', { practiceAreaId: currentPracticeArea.id });
  //   } catch (error) {
  //     // ... error handling ...
  //   }
  // };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reflection Feedback Screen</Text>
      <Text style={styles.note}>
        (Session context will be cleared after reflection is saved)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
  },
  note: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});

export default ReflectionFeedbackScreen;


