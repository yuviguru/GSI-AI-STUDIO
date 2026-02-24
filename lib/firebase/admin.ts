import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function getServiceAccount(): ServiceAccount {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!encoded) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set');
  }
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8')) as ServiceAccount;
}

const app =
  getApps().length === 0
    ? initializeApp({ credential: cert(getServiceAccount()) })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);
export default app;
