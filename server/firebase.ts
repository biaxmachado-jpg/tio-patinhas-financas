import admin from "firebase-admin";
import { ENV } from "./_core/env";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: ENV.firebaseProjectId,
      clientEmail: ENV.firebaseClientEmail,
      privateKey: ENV.firebasePrivateKey?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = admin.auth();
export const firestore = admin.firestore();
