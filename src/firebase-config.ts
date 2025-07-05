import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  // これらの値は実際のFirebaseプロジェクトの設定に置き換えてください
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// FCM messaging service
let messaging: Messaging | null = null;
try {
  messaging = getMessaging(app);
  console.log('Firebase messaging initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase messaging:', error);
}

export { messaging };

// VAPID Key - Firebase Console > Project Settings > Cloud Messaging で取得
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if messaging is available
    if (!messaging) {
      console.error('Firebase messaging not initialized');
      return null;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    // Check VAPID key
    if (!vapidKey) {
      console.error('VAPID key not configured');
      return null;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      try {
        // Try to get token without service worker first (for development)
        console.log('Attempting to get FCM token...');
        const token = await getToken(messaging, {
          vapidKey: vapidKey,
        });
        
        if (token) {
          console.log('FCM Registration Token:', token);
          return token;
        } else {
          console.log('No registration token available. Trying with service worker...');
          
          // Try to register service worker manually
          if ('serviceWorker' in navigator) {
            try {
              console.log('Attempting to register Firebase service worker...');
              
              // Clear any existing registrations first
              const existingRegistrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of existingRegistrations) {
                if (registration.scope.includes('firebase-messaging-sw')) {
                  await registration.unregister();
                  console.log('Unregistered existing Firebase SW');
                }
              }
              
              const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
                scope: '/firebase-cloud-messaging-push-scope',
              });
              console.log('Service worker registered:', registration);
              
              // Wait for service worker to activate
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Try to get token again
              const tokenWithSW = await getToken(messaging, {
                vapidKey: vapidKey,
                serviceWorkerRegistration: registration,
              });
              
              if (tokenWithSW) {
                console.log('FCM Registration Token (with SW):', tokenWithSW);
                return tokenWithSW;
              } else {
                console.error('Failed to get token even with service worker');
              }
            } catch (swError) {
              console.error('Service worker registration failed:', swError);
            }
          }
          
          return null;
        }
      } catch (tokenError) {
        console.error('Error getting FCM token:', tokenError);
        
        // Try alternative approach for localhost development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('Development environment detected. FCM might not work fully on localhost.');
          alert('FCM通知は本番環境（HTTPS）でのみ完全に動作します。開発環境では制限があります。');
        }
        
        return null;
      }
    } else {
      console.log('Notification permission denied.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token:', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      console.error('Firebase messaging not initialized for onMessage');
      return;
    }
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground:', payload);
      resolve(payload);
    });
  });