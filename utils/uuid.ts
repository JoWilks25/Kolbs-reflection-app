import uuid from 'react-native-uuid';

/**
 * Generate a unique UUID v4 identifier
 * @returns A unique UUID string
 * @example
 * const id = generateId(); // "550e8400-e29b-41d4-a716-446655440000"
 */
export const generateId = (): string => {
  return uuid.v4() as string;
};

