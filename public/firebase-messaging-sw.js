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

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  // Check if any client (tab) is currently focused
  self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function(clients) {
    const isAnyClientFocused = clients.some(client => client.focused);
    
    // Only show notification if no client is focused (true background)
    if (!isAnyClientFocused) {
      const notificationTitle = payload.notification?.title || '英単語学習リマインダー';
      const notificationOptions = {
        body: payload.notification?.body || '新しい学習リマインダーがあります',
        icon: payload.notification?.icon || '/logo192.png',
        badge: '/logo192.png',
        data: payload.data,
        tag: 'vocabulary-reminder', // Use same tag to prevent duplicates
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

      self.registration.showNotification(notificationTitle, notificationOptions);
    } else {
      console.log('[firebase-messaging-sw.js] Client is focused, skipping background notification');
    }
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