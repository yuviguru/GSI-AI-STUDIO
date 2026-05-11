/**
 * Firebase backend adapter — bundles all three ports into a single Backend.
 */

import type { Backend } from '../index';
import { FirebaseDataStore } from './firebaseDataStore';
import { FirebaseAuthAdapter } from './firebaseAuth';
import { FirebaseStorageAdapter } from './firebaseStorage';

export function firebaseAdapter(): Backend {
  return {
    name: 'firebase',
    data: new FirebaseDataStore(),
    auth: new FirebaseAuthAdapter(),
    storage: new FirebaseStorageAdapter(),
  };
}
