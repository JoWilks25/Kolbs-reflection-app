# Android Deployment Guide (Without AI)

**Last Updated:** February 25, 2026  
**Scope:** Ship the app on Android via Expo/EAS with AI features disabled, with explicit platform support and Gemini Nano availability constraints documented  
**Estimated Effort:** 1–2 days of code changes + 3–5 days of device testing

---

## 1. Overview and Current State

The Kolb's Reflection Cycle App is built with React Native + Expo SDK 54 and currently targets iOS only. The AI coaching features use `@react-native-ai/apple` (Apple Foundation Models), which has no Android equivalent. This document covers everything needed to ship a fully functional Android version with AI features disabled, relying on the app's existing graceful-degradation path (static coaching-tone prompts).

### Official Android support baseline

- **Non-AI app minimum:** Android 10+ (API 29+).
- **Support policy:** Android versions below 10 are not officially tested.

### Gemini Nano / AICore availability (future Android AI work)

- **Gemini Nano requirement:** Android 14+ and device-level AICore support.
- **Likely supported class:** Pixel 8/9 and Galaxy S24/S25 class flagship devices (or equivalent).
- **Likely unsupported class:** most Android 10-13 devices and many mid/low-tier devices.

### Behavior contract across devices

- The app's non-AI experience (static prompts, notifications, reflection flow) works on Android 10+.
- On devices without Gemini Nano eligibility (Android <14 or no AICore support), the app must not attempt Gemini Nano calls.
- Unsupported devices continue to use static, non-AI prompts and existing fallback logic only.

### What already exists

- **`android/` native project** — generated via `expo prebuild`, includes Gradle files, `AndroidManifest.xml`, and adaptive icon configuration.
- **Cross-platform UI** — all screens use standard React Native components; platform-specific styling is already handled with `Platform.OS` checks in the few places it matters.
- **AI graceful degradation** — `checkAIAvailability()` in `services/aiService.ts` already returns `false` when `Platform.OS !== 'ios'`, and the rest of the app falls back to static prompts automatically.

### What needs to change

The changes fall into three categories: configuration updates, a single minor text fix, and thorough testing on Android devices.

---

## 2. Configuration Changes

### 2.1 `app.json` — Enable Android platform

The `platform` array (line 15–17) currently restricts builds to iOS:

```json
"platform": [
  "ios"
]
```

Change to:

```json
"platform": [
  "ios",
  "android"
]
```

Alternatively, remove the `platform` field entirely — Expo defaults to both platforms when omitted.

### 2.2 `eas.json` — Add Android build types

The current `eas.json` has no platform-specific build settings. Add Android configuration to each profile for the appropriate distribution format:

```json
{
  "cli": {
    "version": ">= 16.28.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "app-bundle"
      },
      "distribution": "store"
    }
  },
  "submit": {
    "production": {}
  }
}
```

Key choices:
- **Preview** uses `"buildType": "apk"` for easy sideloading to test devices.
- **Production** uses `"buildType": "app-bundle"` (AAB) for Play Store submission.
- **Minimum Android version** is not set in `eas.json`; it is enforced via app/native Android config.

### 2.3 Android-specific config already in place

The following are already configured and require no changes:

| File | Detail |
|------|--------|
| `app.json` → `android.adaptiveIcon` | Foreground image and background colour set |
| `app.json` → `android.package` | `com.joanne.kolbsreflection` |
| `app.json` → `android.edgeToEdgeEnabled` | `true` |
| `android/gradle.properties` | New Architecture enabled, Hermes enabled, edge-to-edge enabled |
| `android/app/src/main/AndroidManifest.xml` | Biometric, storage, internet, and vibrate permissions declared |

---

## 3. Code Changes

### 3.1 AI Service — No changes needed

`services/aiService.ts` → `checkAIAvailability()` (line 34–59):

```typescript
export const checkAIAvailability = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    console.log('AI unavailable: Not running on iOS');
    return false;
  }
  // ...
};
```

This guard ensures all downstream AI code paths are never reached on Android:
- `useAICoaching` hook falls back to static prompts when `aiAvailable` is `false`.
- The AI toggle in `ReflectionToneScreen` only renders when `aiAvailable` is `true`.
- `SessionSetupScreen` skips intent analysis when `aiAvailable` is `false`.

**Risk note:** `@react-native-ai/apple` is imported at the top of `aiService.ts`. Metro's tree-shaking and the platform-specific native module resolution mean the import will resolve to a no-op on Android since the native module won't be linked. If the build fails due to this import, wrap it in a conditional require:

```typescript
const apple = Platform.OS === 'ios'
  ? require('@react-native-ai/apple').apple
  : null;
```

### 3.2 Settings Screen — Minor text change

`screens/SettingsScreen.tsx`, line 212:

Current:
```
Enable device lock in iOS Settings for better privacy protection.
```

Change to:
```
Enable device lock in your device settings for better privacy protection.
```

This is the only hardcoded iOS-specific user-facing string in the codebase.

### 3.3 Settings Screen — AI status copy

`screens/SettingsScreen.tsx`, lines 232–248:

The AI Coaching Status section displays "AI coaching unavailable on this device" when `aiAvailable` is `false`. This copy works as-is for Android — no mention of Apple Intelligence in the unavailable state. However, the available state (line 236) says "AI coaching available (Apple Intelligence)". Since this branch will never render on Android, no change is needed.

### 3.4 Export Service — No changes needed

`services/exportService.ts`, line 171:

```typescript
await Sharing.shareAsync(fileUri, {
  mimeType: 'application/json',
  dialogTitle: 'Export Kolbs Reflection Data',
  UTI: 'public.json',
});
```

`UTI` is an iOS-specific Uniform Type Identifier. On Android, `expo-sharing` ignores this parameter and uses `mimeType` instead. No change required.

### 3.5 ReflectionToneScreen — No changes needed

`screens/ReflectionToneScreen.tsx`, line 154–159:

```typescript
<Switch
  value={localAiEnabled}
  onValueChange={handleAiToggle}
  trackColor={{ false: COLORS.neutral[300], true: COLORS.primary }}
  thumbColor={Platform.OS === 'android' ? COLORS.surface : undefined}
  ios_backgroundColor={COLORS.neutral[300]}
/>
```

Platform-specific styling is already handled. The entire AI toggle section is conditionally rendered (`{aiAvailable && ...}`), so it won't appear on Android at all.

### 3.6 ReflectionPromptsScreen — No changes needed

`screens/ReflectionPromptsScreen.tsx`:

- Line 534: `KeyboardAvoidingView` already uses `Platform.OS === "ios" ? "padding" : "height"`.
- Line 851: Footer padding already adjusts via `Platform.OS === "ios" ? SPACING.lg : SPACING.md`.

### 3.7 Navigation — Review back button behaviour

`navigation/RootStackNavigator.tsx`, line 60–66:

```typescript
<Stack.Screen
  name="SessionActive"
  component={SessionActiveScreen}
  options={{
    title: "Session Active",
    headerLeft: () => null,
    gestureEnabled: false,
  }}
/>
```

`gestureEnabled: false` prevents iOS back-swipe but does **not** block the Android hardware back button. The app currently has no `BackHandler` usage anywhere. During an active session, the user could press the hardware back button and leave the screen without ending the session.

**Recommendation:** Add a `BackHandler` in `SessionActiveScreen` that either:
- Shows a confirmation alert ("End session before leaving?"), or
- Prevents navigation entirely (returns `true` from the handler).

Similarly, `ReflectionToneScreen` overrides `headerLeft` to reset to Home. The default Android back button press would use the standard stack pop, which may not match the intended flow. Verify that the behaviour is acceptable or add a `BackHandler` there too.

---

## 4. Dependency Compatibility

All dependencies used by the app support Android:

| Dependency | Android Support | Notes |
|-----------|----------------|-------|
| `expo-sqlite` | Yes | Cross-platform SQLite, same API |
| `expo-secure-store` | Yes | Uses Android Keystore |
| `expo-local-authentication` | Yes | Supports fingerprint + face unlock |
| `expo-notifications` | Yes | See Section 6 for permission notes |
| `expo-file-system` | Yes | Cross-platform file I/O |
| `expo-sharing` | Yes | Uses Android share intent |
| `expo-document-picker` | Yes | Uses Android file picker |
| `expo-status-bar` | Yes | Cross-platform |
| `expo-dev-client` | Yes | Cross-platform development builds |
| `@react-native-async-storage/async-storage` | Yes | Cross-platform |
| `@react-native-picker/picker` | Yes | Cross-platform |
| `react-native-toast-message` | Yes | Cross-platform |
| `react-native-safe-area-context` | Yes | Cross-platform |
| `react-native-screens` | Yes | Cross-platform |
| `zustand` | Yes | Pure JS, no native code |
| `@react-native-ai/apple` | **No** | iOS-only; guarded by `Platform.OS` check |

### Expo plugins (`app.json` → `plugins`)

All three configured plugins are cross-platform:
- `expo-sqlite`
- `expo-secure-store`
- `expo-document-picker`

---

## 5. Assets

| Asset | Status | Action |
|-------|--------|--------|
| `assets/adaptive-icon.png` | Exists | Used by Android adaptive icon config |
| `assets/icon.png` | Exists | Used as app icon |
| `assets/splash-icon.png` | Exists | Used for splash screen |
| `assets/favicon.png` | Exists | Web only, not relevant |

No new assets are required. Expo automatically generates the required Android density variants (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) from the source images during the build.

---

## 6. Android-Specific Considerations

### 6.1 Hardware back button

See Section 3.7 above. Key screens to address:
- **SessionActiveScreen** — must prevent accidental exit during a timed session.
- **ReflectionToneScreen** — headerLeft override resets to Home; verify Android back button behaviour matches.

### 6.2 Notification permissions (Android 13+)

Android 13 (API 33) introduced the `POST_NOTIFICATIONS` runtime permission. The `expo-notifications` library handles the permission request via `Notifications.requestPermissionsAsync()` in `services/notificationService.ts` (line 10). This works on Android, but note:

- On Android 12 and below, notifications are allowed by default.
- On Android 13+, the user will see a system permission dialog the first time the app requests notification access.
- If the user denies, the target-duration notification in `SessionActiveScreen` will fail silently (the `try/catch` in `scheduleTargetReachedNotification` handles this).

No code changes are needed, but the UX should be tested to ensure the permission prompt appears at a sensible time (currently at app startup).

### 6.3 AndroidManifest.xml

Already includes all required permissions:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
<uses-permission android:name="android.permission.USE_BIOMETRIC"/>
<uses-permission android:name="android.permission.USE_FINGERPRINT"/>
<uses-permission android:name="android.permission.VIBRATE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

`READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` are only effective on Android 12 and below. On Android 13+, scoped storage is enforced and these are ignored. The app uses `expo-file-system` which handles scoped storage correctly.

### 6.4 Edge-to-edge display

Already enabled in both `gradle.properties` (`edgeToEdgeEnabled=true`) and `app.json` (`android.edgeToEdgeEnabled: true`). The `predictiveBackGestureEnabled` flag is set to `false`, which is correct for now since the app doesn't implement predictive back animations.

### 6.5 Release signing

`android/app/build.gradle` (lines 100–107) uses the debug keystore for release builds:

```groovy
release {
    signingConfig signingConfigs.debug
    // ...
}
```

For Play Store distribution, you will need to either:
- Let EAS Build manage signing (recommended — EAS generates and stores a production keystore automatically), or
- Generate a production keystore and configure it in `credentials.json`.

For preview/internal testing, the debug keystore is fine.

---

## 7. Build and Deployment

### 7.1 Development build (for Android emulator or connected device)

```bash
# Build a development client APK via EAS
eas build --profile development --platform android

# Or build locally (requires Android SDK)
npx expo run:android
```

### 7.2 Preview build (internal testing APK)

```bash
eas build --profile preview --platform android
```

Download the APK from the EAS dashboard and install on a device via `adb install <path>.apk` or direct file transfer.

### 7.3 Production build (Play Store)

```bash
# Build AAB for Play Store
eas build --profile production --platform android

# Submit to Play Store
eas submit --platform android
```

Play Store submission requires:
- A Google Play Developer account ($25 one-time fee).
- App listing metadata (screenshots, descriptions, privacy policy).
- Content rating questionnaire.
- Production keystore (EAS manages this automatically if you haven't configured one).

### 7.4 Running on a connected device

```bash
# Verify device is connected
adb devices

# Build and install directly
npx expo run:android --device
```

Requires USB Debugging enabled on the Android device (Settings → Developer Options → USB Debugging).

---

## 8. Testing Checklist

Test each item on at least one physical Android device (emulator is acceptable for initial passes but physical device testing is essential before release).

### Core Functionality

- [ ] **App launch** — app initialises without errors, database is created
- [ ] **Practice area CRUD** — create, edit, delete practice areas with all four types
- [ ] **Session setup** — intent input, duration presets, "Use this intent" button, start session
- [ ] **Session active** — timer counts correctly, survives app backgrounding/foregrounding
- [ ] **Target duration** — notification fires when target is reached, vibration works
- [ ] **End session** — "End & Reflect Now" and "End Session & Reflect Later" both work
- [ ] **Reflection tone selection** — all three tones selectable, AI toggle is NOT visible
- [ ] **Reflection prompts** — static prompts display for each step, text input works, character limit enforced
- [ ] **Follow-up questions** — hardcoded follow-ups appear for brief answers (AI-generated ones will not)
- [ ] **Draft persistence** — backgrounding during reflection preserves draft, crash recovery works
- [ ] **Reflection feedback** — emoji rating and optional note, save completes successfully
- [ ] **Series timeline** — sessions and reflections display correctly, session detail modal works
- [ ] **Session deletion** — soft delete from timeline works
- [ ] **Move session** — moving a session to a different practice area works

### Data Management

- [ ] **Export** — Android share intent opens with JSON file
- [ ] **Import** — document picker opens, valid JSON file imports correctly
- [ ] **Import validation** — invalid files show appropriate error messages

### Navigation

- [ ] **Hardware back button** — correct behaviour on every screen, especially SessionActive and ReflectionTone
- [ ] **Stack navigation** — forward/back navigation works throughout the app
- [ ] **Deep navigation** — pending reflections banner navigates to correct timeline

### UI / UX

- [ ] **Keyboard behaviour** — text inputs scroll into view, keyboard doesn't obscure content
- [ ] **Scroll behaviour** — all scrollable screens scroll correctly
- [ ] **Security warning banner** — appears when device has no lock, dismisses correctly
- [ ] **Pending reflections banner** — displays correct count and navigates to timeline
- [ ] **Toast messages** — success/error toasts appear and dismiss on time
- [ ] **Edge-to-edge** — content doesn't overlap with status bar or navigation bar
- [ ] **Adaptive icon** — app icon renders correctly on home screen and app drawer

### Permissions

- [ ] **Notification permission** — prompt appears on Android 13+, app handles denial gracefully
- [ ] **Biometric check** — `expo-local-authentication` correctly detects enrolled biometrics/passcode
- [ ] **File access** — export and import work on Android 13+ (scoped storage)

### Device Matrix

Test on a minimum of:
- [ ] Android 10 or 11 (API 29/30) — official minimum support baseline
- [ ] Android 13 (API 33) — notification permission prompt
- [ ] Android 14+ (API 34) — latest, verify edge-to-edge and predictive back

---

## 9. Summary of Required Changes

| Change | File | Type | Effort |
|--------|------|------|--------|
| Add `"android"` to platform array | `app.json` | Config | 1 min |
| Add Android build types to profiles | `eas.json` | Config | 5 min |
| Update "iOS Settings" to "device settings" | `screens/SettingsScreen.tsx` | Code | 1 min |
| Add `BackHandler` for SessionActive screen | `screens/SessionActiveScreen.tsx` | Code | 30 min |
| Verify/add `BackHandler` for ReflectionTone | `screens/ReflectionToneScreen.tsx` | Code | 15 min |
| Conditional `@react-native-ai/apple` import (if needed) | `services/aiService.ts` | Code | 10 min |
| Full Android test pass | — | Testing | 3–5 days |
