/**
 * Format seconds into MM:SS or HH:MM:SS format
 * @param seconds - Time in seconds
 * @returns Formatted time string
 * @example
 * formatTime(65) → "01:05"
 * formatTime(3665) → "01:01:05"
 */
export const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    // HH:MM:SS format
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    // MM:SS format
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
};

/**
 * Format seconds into human-readable duration (e.g., "30 min", "1h 15min")
 * @param seconds - Duration in seconds
 * @returns Human-readable duration string
 * @example
 * formatDuration(1800) → "30 min"
 * formatDuration(4500) → "1h 15min"
 */
export const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}min` : `${hrs}h`;
  } else {
    return `${mins} min`;
  }
};

/**
 * Format timestamp into human-readable date/time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 * @example
 * formatDateTime(1702918800000) → "Dec 16, 10:30 AM"
 */
export const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-US', options);
};

/**
 * Format timestamp into date only
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string
 * @example
 * formatDate(1702918800000) → "Dec 16, 2024"
 */
export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };
  return date.toLocaleString('en-US', options);
};

/**
 * Format milliseconds remaining into hours remaining text
 * @param millisecondsRemaining - Time remaining in milliseconds
 * @returns Formatted hours remaining string
 * @example
 * formatHoursRemaining(72000000) → "20h remaining"
 * formatHoursRemaining(7200000) → "2h remaining"
 */
export const formatHoursRemaining = (millisecondsRemaining: number): string => {
  const hoursRemaining = Math.ceil(millisecondsRemaining / (1000 * 60 * 60));
  return `${hoursRemaining}h remaining`;
};

