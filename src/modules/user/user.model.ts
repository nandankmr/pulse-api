/**
 * User model interface defining the structure of user entities
 */
export interface User {
  /** Unique identifier for the user */
  id: string;
  /** User's full name */
  name: string;
  /** User's email address */
  email: string;
  /** User's password (hashed) */
  password?: string;
  /** User's avatar URL */
  avatarUrl?: string | null;
  /** Whether user's email is verified */
  verified?: boolean;
  /** Timestamp when the user was created */
  createdAt?: Date;
  /** Timestamp when the user was last updated */
  updatedAt?: Date;
  /** Timestamp when the user was soft deleted (null if not deleted) */
  deletedAt?: Date | null;
} 
