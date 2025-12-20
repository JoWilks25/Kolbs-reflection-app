/**
 * Security Service
 * 
 * Provides device security checks using expo-local-authentication
 * Per tech spec Section 8.2 (lines 1247-1268)
 */

import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Check if device has security enabled (Face ID, Touch ID, or passcode)
 * 
 * @returns Promise<boolean> - true if device has any form of lock enabled, false otherwise
 * 
 * Usage:
 * ```typescript
 * const isSecure = await checkDeviceSecurity();
 * if (!isSecure) {
 *   // Show warning banner
 * }
 * ```
 */
export const checkDeviceSecurity = async (): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.getEnrolledLevelAsync();
    // Treat any enrolled authentication(passcode / biometric) as secure enough
    // SecurityLevel.NONE = 0 means no security is enabled
    return result !== LocalAuthentication.SecurityLevel.NONE;
  } catch (error) {
    console.warn('Failed to check device security', error);
    // Safe default: assume not secure if check fails
    return false;
  }
};

