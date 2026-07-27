import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;
let messagingInstance: any = null;

export const initFirebase = () => {
  if (isFirebaseInitialized) return;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : 'D:\\Project\\wow\\phela-web-firebase-adminsdk-fbsvc-f065e87062.json';

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      const app = initializeApp({
        credential: cert(serviceAccount),
      });
      messagingInstance = getMessaging(app);
      isFirebaseInitialized = true;
      console.log('✅ Firebase Admin initialized successfully.');
    } else {
      console.warn('⚠️ Firebase Admin NOT initialized. Could not find service account at:', serviceAccountPath);
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
};

export const getFirebaseAdmin = () => {
  if (!isFirebaseInitialized || !messagingInstance) return null;
  return { messaging: () => messagingInstance };
};
