import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ReflectionPromptsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reflection Prompts Screen</Text>
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
});

export default ReflectionPromptsScreen;


