import * as Notifications from 'expo-notifications';

/**
 * Setup notification permissions and configure foreground notification handler
 * @returns true if permissions granted, false otherwise
 */
export const setupNotifications = async (): Promise<boolean> => {
  try {
    // Request permissions (iOS)
    const { status } = await Notifications.requestPermissionsAsync();

    console.log('Notification permission status:', status); // ADD THIS

    if (status !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Set handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log('Notification handler set successfully'); // ADD THIS
    return true;
  } catch (error) {
    console.error('Failed to setup notifications:', error);
    return false;
  }
};

/**
 * Schedule an immediate notification when target duration is reached
 */
export const scheduleTargetReachedNotification = async (): Promise<void> => {
  try {
    console.log('Scheduling target reached notification...'); // ADD THIS
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Practice time complete! 🎉',
        body: 'You reached your target duration. Continue or end session?',
        sound: true,
        data: { type: 'targetreached' },
      },
      trigger: null, // Immediate notification
    });
    console.log('Notification scheduled with ID:', notificationId); // ADD THIS
  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
};

