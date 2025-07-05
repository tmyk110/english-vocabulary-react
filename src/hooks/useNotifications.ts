import { useState, useEffect, useCallback } from 'react';
import type { VocabularyWord } from '../types';
import { supabase } from '../supabaseClient';

interface UseNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  scheduleNotification: (words: VocabularyWord[]) => Promise<void>;
  isServiceWorkerRegistered: boolean;
  isSubscribed: boolean;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isServiceWorkerRegistered, setIsServiceWorkerRegistered] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

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
        // Service Workerのパス
        const swPath = '/sw.js';
        
        console.log(`🔄 Registering Service Worker at: ${swPath}`);
        const registration = await navigator.serviceWorker.register(swPath);
        console.log('✅ Service Worker registered successfully:', registration);
        
        // Service Workerがアクティブになるまで待機
        if (registration.installing) {
          console.log('🔄 Service Worker installing...');
          await new Promise((resolve) => {
            registration.installing!.addEventListener('statechange', (e) => {
              const sw = e.target as ServiceWorker;
              console.log('Service Worker state:', sw.state);
              if (sw.state === 'activated') {
                console.log('✅ Service Worker activated');
                resolve(true);
              }
            });
          });
        } else if (registration.waiting) {
          console.log('🔄 Service Worker waiting...');
        } else if (registration.active) {
          console.log('✅ Service Worker already active');
        }
        
        setIsServiceWorkerRegistered(true);
        
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
        });
        
      }
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
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

  const createOrUpdatePushSubscription = useCallback(async () => {
    console.log('🔧 createOrUpdatePushSubscription called');
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }
      console.log('✅ Service Worker supported');

      // 現在のService Workerの状況を確認
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log('📋 Current SW registrations:', registrations);
      
      if (registrations.length > 0) {
        const reg = registrations[0];
        console.log('🔍 SW Registration details:', {
          active: !!reg.active,
          installing: !!reg.installing,
          waiting: !!reg.waiting,
          scope: reg.scope,
          updateViaCache: reg.updateViaCache
        });
        
        if (reg.active) {
          console.log('✅ Active SW state:', reg.active.state);
        }
        if (reg.installing) {
          console.log('🔄 Installing SW state:', reg.installing.state);
        }
        if (reg.waiting) {
          console.log('⏳ Waiting SW state:', reg.waiting.state);
        }
      }
      
      if (registrations.length === 0) {
        console.log('⚠️ No Service Worker registered, registering now...');
        await registerServiceWorker();
      }

      console.log('🔄 Waiting for Service Worker ready...');
      
      // Service Workerが存在するかチェック
      let registration: ServiceWorkerRegistration;
      
      try {
        // 登録されたService Workerが既にアクティブな場合は、それを使用
        if (registrations.length > 0 && registrations[0].active) {
          console.log('🎯 Using existing active Service Worker');
          registration = registrations[0];
        } else {
          // readyを短いタイムアウトで待機
          console.log('⏰ Waiting for Service Worker ready (5 seconds timeout)...');
          const readyPromise = navigator.serviceWorker.ready;
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Ready timeout')), 5000)
          );
          
          registration = await Promise.race([readyPromise, timeoutPromise]) as ServiceWorkerRegistration;
          console.log('✅ Service Worker ready:', registration);
        }
      } catch (readyError) {
        console.error('❌ Service Worker ready failed:', readyError);
        
        // readyが失敗した場合、既存の登録を使用するか新規登録
        if (registrations.length > 0) {
          console.log('🔄 Using existing registration despite ready failure');
          registration = registrations[0];
        } else {
          console.log('🔄 Attempting direct registration...');
          registration = await navigator.serviceWorker.register('/sw.js');
          console.log('✅ Service Worker registered directly:', registration);
        }
      }
      
      // VAPID公開キーを環境変数から取得
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      
      console.log('🔑 VAPID Key check:', {
        exists: !!vapidPublicKey,
        length: vapidPublicKey?.length,
        preview: vapidPublicKey?.substring(0, 10) + '...'
      });
      
      if (!vapidPublicKey) {
        console.error('❌ VAPID public key not found in environment variables');
        alert('プッシュ通知の設定が不完全です。管理者にお問い合わせください。');
        return;
      }

      // プッシュサブスクリプションを作成
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Push subscription created:', subscription);

      // Supabaseにサブスクリプションを保存
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        alert('ログインしてください。');
        return;
      }

      // プッシュサブスクリプションキーをBase64エンコード
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Push subscription keys are missing');
      }

      // Uint8ArrayをArrayに変換してからスプレッド演算子を使用
      const p256dhArray = Array.from(new Uint8Array(p256dhKey));
      const authArray = Array.from(new Uint8Array(authKey));

      const subscriptionData = {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: btoa(String.fromCharCode(...p256dhArray)),
        auth_key: btoa(String.fromCharCode(...authArray)),
        user_agent: navigator.userAgent,
        is_active: true
      };

      // 既存のサブスクリプションを無効化
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // 新しいサブスクリプションを挿入
      const { error } = await supabase
        .from('push_subscriptions')
        .insert(subscriptionData);

      if (error) {
        console.error('Error saving subscription:', error);
        alert('サブスクリプションの保存に失敗しました。');
        return;
      }

      console.log('Push subscription saved successfully');
      setIsSubscribed(true);

    } catch (error) {
      console.error('❌ Error creating push subscription:', error);
      alert('プッシュ通知の設定に失敗しました。');
    }
  }, []);

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
      // まず即座にテスト通知を表示
      const randomWord = words[Math.floor(Math.random() * words.length)];
      console.log('Showing test notification for word:', randomWord);
      
      const notification = new Notification('英単語学習リマインダー（テスト）', {
        body: `「${randomWord.word}」の意味は覚えていますか？\n意味: ${randomWord.meaning}`,
        icon: '/logo192.png',
        requireInteraction: false,
      });

      let notificationShown = false;

      notification.onclick = () => {
        console.log('Notification clicked');
        notification.close();
      };

      notification.onshow = () => {
        console.log('Notification shown successfully!');
        notificationShown = true;
      };

      notification.onerror = (error) => {
        console.error('Notification error:', error);
        alert('通知の表示でエラーが発生しました。');
      };

      setTimeout(() => {
        if (notificationShown) {
          console.log('✅ テスト通知が正常に表示されました！');
        } else {
          console.log('⚠️ テスト通知の表示状況を確認できませんでした');
        }
      }, 1000);

      // プッシュ通知サブスクリプションを作成・更新
      console.log('📱 Starting push subscription creation...');
      await createOrUpdatePushSubscription();
      console.log('📱 Push subscription creation completed');

    } catch (error) {
      console.error('Failed to schedule notification:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`通知の送信に失敗しました: ${errorMessage}`);
    }
  }, [isSupported, permission, createOrUpdatePushSubscription]);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsSubscribed(false);
        return;
      }

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      setIsSubscribed(!!subscriptions && subscriptions.length > 0);
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setIsSubscribed(false);
    }
  }, []);

  useEffect(() => {
    if (isSupported && permission === 'granted') {
      checkSubscriptionStatus();
    }
  }, [isSupported, permission, checkSubscriptionStatus]);

  return {
    isSupported,
    permission,
    requestPermission,
    scheduleNotification,
    isServiceWorkerRegistered,
    isSubscribed,
  };
};