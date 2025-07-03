import { useState, useEffect, useCallback } from 'react';
import type { VocabularyWord } from '../types';

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  scheduleNotification: (words: VocabularyWord[]) => Promise<void>;
  isServiceWorkerRegistered: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = useState(false);

  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
      registerServiceWorker();
    }
  }, [isSupported]);

  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        // 複数のパスを試行
        const swPaths = [
          '/english-vocabulary-react/sw.js',  // 開発環境用
          '/sw.js',                           // プロダクション環境用
          `${process.env.PUBLIC_URL}/sw.js`   // PUBLIC_URL使用
        ];
        
        let registration = null;
        let registrationSuccessful = false;
        
        for (const swPath of swPaths) {
          try {
            console.log(`Trying to register Service Worker at: ${swPath}`);
            registration = await navigator.serviceWorker.register(swPath);
            console.log('Service Worker registered successfully:', registration);
            registrationSuccessful = true;
            break;
          } catch (pathError) {
            console.log(`Failed to register Service Worker at ${swPath}:`, pathError);
          }
        }
        
        if (registrationSuccessful && registration) {
          setIsServiceWorkerRegistered(true);
          
          registration.addEventListener('updatefound', () => {
            console.log('Service Worker update found');
          });

          // Service Workerがアクティブになるまで待機
          if (registration.installing) {
            registration.installing.addEventListener('statechange', (e) => {
              const sw = e.target as ServiceWorker;
              if (sw && sw.state === 'activated') {
                console.log('Service Worker activated');
              }
            });
          }
        } else {
          throw new Error('All Service Worker registration attempts failed');
        }
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      setIsServiceWorkerRegistered(false);
    }
  };

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const scheduleNotification = useCallback(async (words: VocabularyWord[]): Promise<void> => {
    console.log('scheduleNotification called', { isSupported, permission, wordsLength: words.length });
    
    if (!isSupported) {
      console.error('Notifications not supported');
      alert('お使いのブラウザは通知をサポートしていません。');
      return;
    }

    if (permission !== 'granted') {
      console.error('Notification permission not granted:', permission);
      alert('通知が許可されていません。通知を許可してください。');
      return;
    }

    if (words.length === 0) {
      console.error('No words available for notification');
      alert('通知する英単語がありません。まず英単語を登録してください。');
      return;
    }

    try {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      console.log('Showing notification for word:', randomWord);
      
      // 即座にテスト通知を表示
      const notification = new Notification('英単語学習リマインダー（テスト）', {
        body: `「${randomWord.word}」の意味は覚えていますか？\n意味: ${randomWord.meaning}`,
        icon: '/logo192.png',
        requireInteraction: false, // requireInteractionをfalseに変更
      });

      let notificationShown = false;

      notification.onclick = () => {
        console.log('Notification clicked');
        notification.close();
      };

      notification.onshow = () => {
        console.log('Notification shown successfully!');
        notificationShown = true;
        // アラートを削除して、ログのみに変更
      };

      notification.onerror = (error) => {
        console.error('Notification error:', error);
        alert('通知の表示でエラーが発生しました。');
      };

      // 通知確認のタイムアウトを短縮
      setTimeout(() => {
        if (notificationShown) {
          console.log('✅ テスト通知が正常に表示されました！');
        } else {
          console.log('⚠️ テスト通知の表示状況を確認できませんでした');
        }
      }, 1000);

      // Service Workerに単語データを送信してスケジュール
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Sending message to Service Worker');
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_NOTIFICATION',
          words: words
        });
      } else {
        console.warn('Service Worker controller not available');
      }
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`通知の送信に失敗しました: ${errorMessage}`);
    }
  }, [isSupported, permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    scheduleNotification,
    isServiceWorkerRegistered,
  };
};