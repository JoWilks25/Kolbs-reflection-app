import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ReflectionFormatScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reflection Format Screen</Text>
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

export default ReflectionFormatScreen;


