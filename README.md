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
```bash
# Generate native projects
npx expo prebuild

# Build for iOS (Release configuration)
npx expo run:ios --configuration Release

# Build for Android (Release configuration)
npx expo run:android --configuration Release
```

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

