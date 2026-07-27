import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import path from 'path';
import fs from 'fs';

let isFirebaseInitialized = false;
let messagingInstance: any = null;

export const initFirebase = () => {
  if (isFirebaseInitialized) return;

  try {
    let serviceAccount;

    if (process.env.FIREBASE_CREDENTIALS) {
      serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } else {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH 
        ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : 'D:\\Project\\wow\\phela-web-firebase-adminsdk-fbsvc-f065e87062.json';

      if (fs.existsSync(serviceAccountPath)) {
        serviceAccount = require(serviceAccountPath);
      }
    }

    if (serviceAccount) {
      const app = initializeApp({
        credential: cert(serviceAccount),
      });
      messagingInstance = getMessaging(app);
      isFirebaseInitialized = true;
      console.log('✅ Firebase Admin initialized successfully.');
    } else {
      console.warn('⚠️ Firebase Admin NOT initialized. Could not find service account credentials.');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
  }
};

export const getFirebaseAdmin = () => {
  if (!isFirebaseInitialized || !messagingInstance) return null;
  return { messaging: () => messagingInstance };
};

