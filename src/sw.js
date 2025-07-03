const CACHE_NAME = 'english-vocabulary-v1';

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

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
    scheduleNextNotification();
    console.log('Vocabulary words updated in Service Worker:', words.length);
  }
});

function scheduleNextNotification() {
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  const now = new Date();
  const nextNotification = new Date(now);
  
  // 現在の時刻が10時を過ぎている場合は翌日の10時に設定
  if (now.getHours() >= 10) {
    nextNotification.setDate(nextNotification.getDate() + 1);
  }
  nextNotification.setHours(10, 0, 0, 0);
  
  const timeUntilNotification = nextNotification.getTime() - now.getTime();
  
  console.log(`Next notification scheduled for: ${nextNotification.toLocaleString()}`);
  
  notificationTimeout = setTimeout(() => {
    showDailyNotification();
    scheduleNextNotification(); // 次の日の通知をスケジュール
  }, timeUntilNotification);
}

async function showDailyNotification() {
  try {
    if (vocabularyWords.length === 0) {
      console.log('No vocabulary words available for notification');
      return;
    }
    
    const randomWord = getRandomWord(vocabularyWords);
    
    if (randomWord) {
      await self.registration.showNotification('英単語学習リマインダー', {
        body: `「${randomWord.word}」の意味は覚えていますか？\n意味: ${randomWord.meaning}`,
        icon: '/logo192.png',
        badge: '/logo192.png',
        tag: 'daily-vocabulary',
        requireInteraction: true,
        actions: [
          {
            action: 'review',
            title: '復習する'
          },
          {
            action: 'dismiss',
            title: '後で'
          }
        ]
      });
      console.log('Daily notification sent:', randomWord.word);
    }
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}