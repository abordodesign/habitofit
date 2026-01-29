import admin from 'firebase-admin'

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT

if (!admin.apps.length) {
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    })
  } else if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }
}

export default admin
