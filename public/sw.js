const CACHE_NAME = 'english-vocabulary-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/logo192.png',
      badge: data.badge || '/logo192.png',
      tag: data.tag || 'vocabulary-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {}
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '英単語学習リマインダー', options)
    );
  } else {
    console.log('Push event has no data');
    event.waitUntil(
      self.registration.showNotification('英単語学習リマインダー', {
        body: '新しい英単語を学習しませんか？',
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'vocabulary-notification'
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification.tag);
  event.notification.close();

  const action = event.action;
  
  if (action === 'review') {
    // 復習アクションの場合
    console.log('User clicked review action');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  } else if (action === 'dismiss') {
    // 後でアクションの場合
    console.log('User clicked dismiss action');
    // 特別なアクションは不要
  } else {
    // 通知本体がクリックされた場合
    console.log('Notification body clicked');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
});

self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
});

// 以下は後方互換性のための旧実装（廃止予定）
function getRandomWord(words) {
  if (!words || words.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}

let vocabularyWords = [];
let notificationTimeout = null;

self.addEventListener('message', (event) => {
  const { type, words } = event.data;
  
  if (type === 'SCHEDULE_NOTIFICATION' && words) {
    vocabularyWords = words;
    console.log('Vocabulary words updated in Service Worker (legacy):', words.length);
    console.log('Note: This is using legacy client-side scheduling. Consider using server-side push notifications for better reliability.');
  }
});

// 旧実装の関数（廃止予定）
function scheduleNextNotification() {
  console.log('Legacy scheduling function called - consider migrating to server-side push notifications');
}

async function showDailyNotification() {
  console.log('Legacy notification function called - consider migrating to server-side push notifications');
}