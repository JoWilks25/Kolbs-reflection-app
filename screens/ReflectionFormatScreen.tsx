import React, { useEffect } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/RootStackNavigator";
import { useAppStore } from "../stores/appStore";

type ReflectionFormatScreenNavigationProp = StackNavigationProp<RootStackParamList, "ReflectionFormat">;

const ReflectionFormatScreen: React.FC = () => {
  const navigation = useNavigation<ReflectionFormatScreenNavigationProp>();
  const { lastEndedSessionId } = useAppStore();

  useEffect(() => {
    // Validate session context exists
    if (!lastEndedSessionId) {
      Alert.alert(
        "No Session Found",
        "Please complete a session before reflecting.",
        [{ text: "OK", onPress: () => navigation.navigate("Home") }]
      );
    }
  }, [lastEndedSessionId, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reflection Format Screen</Text>
      {lastEndedSessionId && (
        <Text style={styles.subtitle}>Session ID: {lastEndedSessionId}</Text>
      )}
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
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
});

export default ReflectionFormatScreen;


