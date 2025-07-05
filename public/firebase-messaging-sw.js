// Firebase Cloud Messaging Service Worker
// This file must be in the public folder and accessible at /firebase-messaging-sw.js

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase app in service worker
// Using the same configuration as the main app
const firebaseConfig = {
  apiKey: "AIzaSyAh_P6GMOgar0HKOW9mkXqWQUigjo6dUWQ",
  authDomain: "english-vocabulary-ec4d7.firebaseapp.com",
  projectId: "english-vocabulary-ec4d7",
  storageBucket: "english-vocabulary-ec4d7.firebasestorage.app",
  messagingSenderId: "638849039332",
  appId: "1:638849039332:web:6e03f2dcf46134a022e5f1"
};

firebase.initializeApp(firebaseConfig);

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Debug: Check for multiple service worker registrations
self.addEventListener('install', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] 🎯 BACKGROUND MESSAGE RECEIVED:', payload);
  console.log('[firebase-messaging-sw.js] Service Worker ID:', self.registration.scope);
  console.log('[firebase-messaging-sw.js] Timestamp:', new Date().toISOString());

  // Use unique tag based on message content to prevent duplicates
  const messageId = payload.messageId || payload.data?.messageId || Date.now();
  const uniqueTag = `vocabulary-${messageId}`;
  
  console.log('[firebase-messaging-sw.js] 🔔 Preparing to show notification');
  console.log('[firebase-messaging-sw.js] Message ID:', messageId);
  console.log('[firebase-messaging-sw.js] Using notification tag:', uniqueTag);
  console.log('[firebase-messaging-sw.js] Payload:', payload);

  const notificationTitle = payload.notification?.title || '英単語学習リマインダー';
  const notificationOptions = {
    body: payload.notification?.body || '新しい学習リマインダーがあります',
    icon: payload.notification?.icon || '/english-vocabulary-react/logo192.png',
    badge: '/english-vocabulary-react/logo192.png',
    data: payload.data,
    tag: uniqueTag, // Unique tag to prevent exact duplicates
    requireInteraction: false,
    timestamp: Date.now(), // Add timestamp for debugging
    actions: [
      {
        action: 'open',
        title: '学習する'
      },
      {
        action: 'close',
        title: '後で'
      }
    ]
  };

  console.log('[firebase-messaging-sw.js] 🚀 Calling showNotification with options:', notificationOptions);
  
  // Enhanced duplicate prevention: Check both existing notifications and recent message cache
  const recentMessageKey = `recent_message_${messageId}`;
  const cacheExpiry = 10000; // 10 seconds - increased for better duplicate prevention
  
  // Check if we've recently processed this message
  if (self[recentMessageKey] && (Date.now() - self[recentMessageKey]) < cacheExpiry) {
    console.log('[firebase-messaging-sw.js] ⚠️ Message recently processed, skipping duplicate');
    return;
  }
  
  // Mark this message as processed IMMEDIATELY to prevent race conditions
  self[recentMessageKey] = Date.now();
  
  // Additional check for global message processing cache
  const globalMessageKey = `global_${messageId}`;
  if (globalThis[globalMessageKey]) {
    console.log('[firebase-messaging-sw.js] ⚠️ Message already processed globally, skipping');
    return;
  }
  globalThis[globalMessageKey] = true;
  
  // Clean up old cache entries
  setTimeout(() => {
    delete self[recentMessageKey];
    delete globalThis[globalMessageKey];
  }, cacheExpiry);
  
  // Also check for existing notifications with the same tag
  self.registration.getNotifications({ tag: uniqueTag })
    .then((existingNotifications) => {
      console.log('[firebase-messaging-sw.js] 🔍 Existing notifications with same tag:', existingNotifications.length);
      
      if (existingNotifications.length > 0) {
        console.log('[firebase-messaging-sw.js] ⚠️ Notification with same tag already exists, skipping');
        // Clear recent message cache for this duplicate
        delete self[recentMessageKey];
        return;
      }
      
      console.log('[firebase-messaging-sw.js] 🚀 Creating notification...');
      
      // Show notification only if no duplicate exists
      return self.registration.showNotification(notificationTitle, notificationOptions);
    })
    .then((result) => {
      if (result !== undefined) { // Only log if showNotification was called
        console.log('[firebase-messaging-sw.js] ✅ Notification displayed successfully');
      }
    })
    .catch((error) => {
      console.error('[firebase-messaging-sw.js] ❌ Failed to show notification:', error);
      // Clear cache on error
      delete self[recentMessageKey];
    });
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  if (event.action === 'open') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
  // If action is 'close' or no action, just close the notification
});