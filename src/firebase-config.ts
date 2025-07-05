import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  // これらの値は実際のFirebaseプロジェクトの設定に置き換えてください
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Firebase設定の検証
const isFirebaseConfigValid = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);
  
  if (missingKeys.length > 0) {
    console.warn('Missing Firebase configuration:', missingKeys);
    return false;
  }
  return true;
};

let app: any = null;
let messaging: Messaging | null = null;

// Firebase初期化
try {
  if (isFirebaseConfigValid()) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase app initialized successfully');
    
    // FCM messaging service - Service Workerが利用可能な場合のみ初期化
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        messaging = getMessaging(app);
        console.log('Firebase messaging initialized successfully');
      } catch (messagingError) {
        console.error('Failed to initialize Firebase messaging:', messagingError);
        console.log('FCM will not be available in this session');
      }
    } else {
      console.log('Service Worker not supported, FCM will not be available');
    }
  } else {
    console.error('Firebase configuration is incomplete. FCM features will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export { messaging };

// VAPID Key - Firebase Console > Project Settings > Cloud Messaging で取得
const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;

export const requestNotificationPermission = async (): Promise<string | null> => {
  try {
    // Check if messaging is available
    if (!messaging) {
      console.error('Firebase messaging not initialized');
      
      // より詳細なエラー情報を提供
      if (!isFirebaseConfigValid()) {
        console.error('Firebase configuration is missing or incomplete');
        alert('Firebase設定が不完全です。管理者にお問い合わせください。');
      } else if (!('serviceWorker' in navigator)) {
        console.error('Service Worker not supported');
        alert('お使いのブラウザではプッシュ通知がサポートされていません。');
      } else {
        alert('プッシュ通知サービスの初期化に失敗しました。ページを再読み込みして再度お試しください。');
      }
      
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
        // First, register service worker before requesting token
        if ('serviceWorker' in navigator) {
          console.log('Registering Firebase service worker first...');
          
          // Clear any existing registrations first
          const existingRegistrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of existingRegistrations) {
            if (registration.scope.includes('firebase') || 
                registration.scope.includes('messaging') ||
                registration.scope.includes('english-vocabulary-react')) {
              await registration.unregister();
              console.log('Unregistered existing Firebase SW:', registration.scope);
            }
          }
          
          try {
            const registration = await navigator.serviceWorker.register('/english-vocabulary-react/firebase-messaging-sw.js', {
              scope: '/english-vocabulary-react/',
            });
            console.log('Service worker registered successfully:', registration);
            
            // Wait for service worker to activate
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Now try to get token with registered service worker
            console.log('Attempting to get FCM token with service worker...');
            const token = await getToken(messaging, {
              vapidKey: vapidKey,
              serviceWorkerRegistration: registration,
            });
            
            if (token) {
              console.log('FCM Registration Token:', token);
              return token;
            } else {
              console.error('Failed to get token even with service worker');
              return null;
            }
          } catch (swError) {
            console.error('Service worker registration failed:', swError);
            
            // Fallback: try without service worker (might work in some cases)
            console.log('Trying to get token without service worker as fallback...');
            const fallbackToken = await getToken(messaging, {
              vapidKey: vapidKey,
            });
            
            if (fallbackToken) {
              console.log('FCM Registration Token (fallback):', fallbackToken);
              return fallbackToken;
            }
            
            return null;
          }
        } else {
          console.error('Service Worker not supported in this browser');
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
  new Promise((resolve, reject) => {
    if (!messaging) {
      console.error('Firebase messaging not initialized for onMessage');
      reject('Messaging not initialized');
      return;
    }
    
    console.log('🔧 Setting up foreground message listener (emergency fallback)');
    
    // Import onMessage for emergency use
    import('firebase/messaging').then(({ onMessage }) => {
      onMessage(messaging!, (payload) => {
        console.log('🔔 EMERGENCY: Received foreground message:', payload);
        
        // Check if page is in foreground (visible and focused)
        const isPageVisible = document.visibilityState === 'visible';
        const isPageFocused = document.hasFocus();
        const isTrueForeground = isPageVisible && isPageFocused;
        
        console.log('🔔 EMERGENCY: Page state - visible:', isPageVisible, 'focused:', isPageFocused, 'trueForeground:', isTrueForeground);
        
        // Only create manual notification if page is truly in foreground
        // If page is in background, Service Worker should handle it
        if (isTrueForeground && Notification.permission === 'granted' && payload.notification) {
          console.log('🔔 EMERGENCY: Creating foreground notification (page is active)');
          
          const notification = new Notification(
            payload.notification.title || '英単語学習リマインダー',
            {
              body: payload.notification.body || '新しい学習リマインダーがあります',
              icon: '/english-vocabulary-react/logo192.png',
              badge: '/english-vocabulary-react/logo192.png',
              tag: `emergency-${Date.now()}`,
              requireInteraction: false,
              data: payload.data
            }
          );

          notification.onclick = () => {
            console.log('Emergency notification clicked');
            window.focus();
            notification.close();
          };

          setTimeout(() => notification.close(), 5000);
          
          console.log('🔔 EMERGENCY: Notification created manually');
        } else {
          console.log('🔔 EMERGENCY: Skipping manual notification - Service Worker should handle this');
        }
        
        resolve(payload);
      });
    }).catch(reject);
  });