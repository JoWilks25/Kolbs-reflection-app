import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { COLORS, SPACING, TYPOGRAPHY } from "../utils/constants";

import HomeScreen from "../screens/HomeScreen";
import SessionSetupScreen from "../screens/SessionSetupScreen";
import SessionActiveScreen from "../screens/SessionActiveScreen";
import ReflectionToneScreen from "../screens/ReflectionToneScreen";
import ReflectionPromptsScreen from "../screens/ReflectionPromptsScreen";
import ReflectionFeedbackScreen from "../screens/ReflectionFeedbackScreen";
import SeriesTimelineScreen from "../screens/SeriesTimelineScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type RootStackParamList = {
  Home: undefined;
  SessionSetup: { practiceAreaId: string };
  SessionActive: undefined;
  ReflectionTone: undefined;
  ReflectionPrompts: { sessionId?: string; editMode?: boolean } | undefined;
  ReflectionFeedback: { sessionId?: string } | undefined;
  SeriesTimeline: { practiceAreaId: string; focusSessionId?: string };
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const RootStackNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: true,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={({ navigation }) => ({
            title: "Home",
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                style={styles.settingsButton}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsIcon}>⚙️</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="SessionSetup"
          component={SessionSetupScreen}
          options={{ title: "Session Setup" }}
        />
        <Stack.Screen
          name="SessionActive"
          component={SessionActiveScreen}
          options={{
            title: "Session Active",
            headerLeft: () => null,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="ReflectionTone"
          component={ReflectionToneScreen}
          options={({ navigation }) => ({
            title: "Coaching Tone",
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => navigation.reset({
                  index: 0,
                  routes: [{ name: 'Home' }],
                })}
                style={styles.backButton}
                activeOpacity={0.7}
              >
                <Text style={styles.backButtonIcon}>←</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="ReflectionPrompts"
          component={ReflectionPromptsScreen}
          options={{ title: "Reflection Prompts" }}
        />
        <Stack.Screen
          name="ReflectionFeedback"
          component={ReflectionFeedbackScreen}
          options={{ title: "Reflection Feedback" }}
        />
        <Stack.Screen
          name="SeriesTimeline"
          component={SeriesTimelineScreen}
          options={{ title: "Series Timeline" }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: "Settings" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  settingsButton: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
  },
  settingsIcon: {
    fontSize: 24,
  },
  backButton: {
    marginLeft: SPACING.md,
    padding: SPACING.xs,
  },
  backButtonIcon: {
    fontSize: 24,
    color: COLORS.primary,
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.primary, // or COLORS.text.primary, depending on your theme
  },
});

export default RootStackNavigator;