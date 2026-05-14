/**
 * @gsi/firebase — admin SDK setup + every Firestore service.
 *
 * Use subpath imports for individual services:
 *   import { listClassesForSchool } from '@gsi/firebase/schoolService';
 *   import { adminDb } from '@gsi/firebase/admin';
 */

export { adminAuth, adminDb, adminStorage } from './admin';
