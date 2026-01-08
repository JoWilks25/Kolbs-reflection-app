# Kolb's Reflection Cycle App

A React Native app for tracking practice sessions and reflections using Kolb's Experiential Learning Cycle.

## Local Development

### Prerequisites
- Node.js
- iOS Simulator (for iOS development) or Android Emulator
- Expo CLI: `npm install -g expo-cli eas-cli`

### Setup
```bash
npm install
```

### Running the App
```bash
# Start the Expo dev server
npm start

# Or run directly on iOS simulator
npm run ios

# Or run directly on Android emulator
npm run android
```

The app uses Expo dev client, so you'll need to have the development build installed on your device/simulator. The dev server enables hot reloading and fast refresh during development.

## Building for Preview

Preview builds create standalone apps that don't require the dev server running.

### Using EAS Build (Cloud)
```bash
# Build for iOS (downloadable .ipa file)
eas build --profile preview --platform ios

# Build for Android (downloadable .apk file)
eas build --profile preview --platform android
```

After the build completes, download the app from the EAS dashboard and install it on your device.

### Local Build

#### Prerequisites
- **iOS**: Xcode installed (macOS only), Apple Developer account (free account works for personal devices)
- **Android**: Android Studio installed, Android SDK configured

#### Building Locally

```bash
# Generate native projects
npx expo prebuild

# Build for iOS (Release configuration)
npx expo run:ios --configuration Release

# Build for Android (Release configuration)
npx expo run:android --configuration Release
```

#### Installing on Your Phone

##### iOS (iPhone/iPad)

1. **Connect your device**: Plug your iPhone/iPad into your Mac via USB
2. **Trust the computer**: On your device, tap "Trust This Computer" when prompted
3. **Open Xcode**: After running `npx expo run:ios`, Xcode should open automatically
4. **Select your device**: In Xcode, select your connected device from the device dropdown (top toolbar)
5. **Configure signing**: 
   - Go to the project settings (click on the project name in the left sidebar)
   - Select your app target
   - Go to "Signing & Capabilities"
   - Select your Apple Developer team (or add your Apple ID)
   - Xcode will automatically create a provisioning profile
6. **Build and install**: Click the "Play" button in Xcode, or run:
   ```bash
   npx expo run:ios --configuration Release --device
   ```
7. **Trust the developer**: On your device, go to Settings → General → VPN & Device Management → Trust the developer

**Alternative: Build IPA file**
```bash
# Build IPA file (after prebuild)
cd ios
xcodebuild -workspace kolbs-reflection.xcworkspace -scheme kolbs-reflection -configuration Release -archivePath build/kolbs-reflection.xcarchive archive
xcodebuild -exportArchive -archivePath build/kolbs-reflection.xcarchive -exportPath build -exportOptionsPlist ExportOptions.plist
```
Then install via Finder (double-click the .ipa) or use Apple Configurator 2.

##### Android

1. **Enable Developer Options** on your Android device:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options
   - Enable "USB Debugging"

2. **Connect your device**: Plug your Android device into your computer via USB

3. **Verify connection**:
   ```bash
   adb devices
   ```
   You should see your device listed. If not, install USB drivers for your device.

4. **Build and install**:
   ```bash
   npx expo run:android --configuration Release --device
   ```
   This will build the APK and automatically install it on your connected device.

**Alternative: Build APK manually**
```bash
# After prebuild, build APK
cd android
./gradlew assembleRelease
# APK will be at: android/app/build/outputs/apk/release/app-release.apk

# Install via ADB
adb install app/build/outputs/apk/release/app-release.apk

# Or transfer the APK file to your phone and install it manually
```

**Note**: For Android, you may need to allow installation from "Unknown Sources" in your device settings if installing manually.

## Production Builds

```bash
# Production build for App Store / Play Store
eas build --profile production --platform ios
eas build --profile production --platform android
```

## Build Profiles

- **development**: Requires dev server, includes development tools
- **preview**: Standalone app for internal testing
- **production**: Standalone app for App Store/Play Store submission

