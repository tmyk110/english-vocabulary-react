import { useState, useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from '../firebase-config';
import { supabase } from '../supabaseClient';

export const useFCMNotifications = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTokenSaved, setIsTokenSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check current permission status
    setPermission(Notification.permission);
  }, []);

  const requestPermissionAndGetToken = async (): Promise<string | null> => {
    setLoading(true);
    console.log('=== FCM Token Request Started ===');
    console.log('Current hostname:', window.location.hostname);
    console.log('Is development environment:', window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    try {
      console.log('Attempting to get real FCM token...');
      const token = await requestNotificationPermission();
      console.log('requestNotificationPermission returned:', token);
      
      if (token) {
        setFcmToken(token);
        setPermission('granted');
        console.log('Real FCM Token obtained:', token);
        return token;
      } else {
        console.log('No real FCM token available, checking development environment...');
        
        // Development environment fallback
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          console.log('✅ Development environment detected: Creating mock FCM token for testing');
          const mockToken = `mock_fcm_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setFcmToken(mockToken);
          setPermission('granted');
          console.log('✅ Mock FCM Token created:', mockToken);
          alert(`開発環境FCM設定完了！\n\nモックトークンが生成されました：\n${mockToken}\n\nこれはテスト用トークンです。本番環境では実際のFCMトークンが使用されます。`);
          return mockToken;
        }
        
        console.log('Not in development environment, returning null');
        setPermission(Notification.permission);
        return null;
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      
      // Development environment fallback for errors
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('⚠️ Development environment: Creating mock FCM token due to error');
        const mockToken = `mock_fcm_token_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setFcmToken(mockToken);
        setPermission('granted');
        console.log('⚠️ Mock FCM Token created (error fallback):', mockToken);
        alert(`開発環境FCM設定（エラー対応）\n\nモックトークンが生成されました：\n${mockToken}\n\nエラーが発生しましたが、開発用にモックトークンを作成しました。`);
        return mockToken;
      }
      
      return null;
    } finally {
      setLoading(false);
      console.log('=== FCM Token Request Completed ===');
    }
  };

  const saveFCMTokenToDatabase = async (token: string): Promise<boolean> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        console.error('User not authenticated');
        return false;
      }

      // Check if token already exists for this user
      const { data: existingToken } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('user_id', user.user.id)
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (existingToken) {
        console.log('FCM token already exists in database');
        setIsTokenSaved(true);
        return true;
      }

      // Deactivate old tokens for this user (user might have multiple devices)
      await supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .eq('user_id', user.user.id);

      // Insert new token
      const { error } = await supabase
        .from('fcm_tokens')
        .insert({
          user_id: user.user.id,
          token: token,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString()
          },
          is_active: true
        });

      if (error) {
        console.error('Error saving FCM token:', error);
        return false;
      }

      console.log('FCM token saved to database successfully');
      setIsTokenSaved(true);
      return true;
    } catch (error) {
      console.error('Error saving FCM token to database:', error);
      return false;
    }
  };

  const setupFCMNotifications = async (): Promise<boolean> => {
    try {
      // Request permission and get token
      const token = await requestPermissionAndGetToken();
      
      if (token) {
        // Save token to database
        const saved = await saveFCMTokenToDatabase(token);
        return saved;
      }
      
      return false;
    } catch (error) {
      console.error('Error setting up FCM notifications:', error);
      return false;
    }
  };

  const testLocalNotification = async (): Promise<void> => {
    try {
      if (Notification.permission !== 'granted') {
        alert('通知許可が必要です。まず通知を許可してください。');
        return;
      }

      // Get a random word for the test
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        alert('ログインが必要です。');
        return;
      }

      const { data: words } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('user_id', user.user.id);

      if (!words || words.length === 0) {
        alert('英単語を登録してからテストしてください。');
        return;
      }

      const randomWord = words[Math.floor(Math.random() * words.length)];

      // Create local notification
      const notification = new Notification('英単語学習リマインダー', {
        body: `「${randomWord.word}」の意味は覚えていますか？`,
        icon: '/logo192.png',
        badge: '/logo192.png',
        requireInteraction: false,
        tag: 'vocabulary-test'
      });

      notification.onclick = () => {
        console.log('Notification clicked!');
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('Local notification sent:', randomWord);
      alert(`ローカル通知を送信しました！\n\n単語: ${randomWord.word}\n意味: ${randomWord.meaning}\n\n通知が画面右上または通知センターに表示されます。`);

    } catch (error) {
      console.error('Error sending local notification:', error);
      alert(`ローカル通知エラー: ${error}`);
    }
  };

  const testFCMNotification = async (): Promise<void> => {
    try {
      // Check if we're using a mock token in development
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isMockToken = fcmToken?.startsWith('mock_fcm_token');
      
      if (isDevelopment && isMockToken) {
        console.log('Development environment: Simulating FCM notification test');
        
        // Show options for testing
        const testOption = window.confirm(
          `開発環境FCMテスト\n\nOK: ローカル通知で実際の通知をテスト\nキャンセル: Edge Function接続テストのみ\n\nモックトークン: ${fcmToken}`
        );

        if (testOption) {
          await testLocalNotification();
        } else {
          alert(`Edge Function接続テスト\n\nモックトークン: ${fcmToken}\n\n本番環境（HTTPS）では実際のFCM通知が送信されます。`);
        }
        return;
      }

      // For production, try Edge Function but fallback to local notification if it fails
      try {
        const response = await fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-fcm-notification`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ test: true })
          }
        );

        const result = await response.json();
        console.log('FCM test result:', result);
        
        if (response.ok) {
          alert(`FCM通知テスト完了\n成功: ${result.successCount || 0}\n失敗: ${result.failureCount || 0}\n合計トークン: ${result.totalTokens || 0}`);
        } else {
          throw new Error(`Edge Function error: ${result.error || 'Unknown error'}`);
        }
      } catch (edgeFunctionError) {
        console.log('Edge Function failed, falling back to local notification test:', edgeFunctionError);
        
        // Show user the option to test with local notification
        const fallbackTest = window.confirm(
          `Edge Function通信エラー\n\n代わりにローカル通知でテストしますか？\n\n(Edge Functionは後でデプロイ設定を確認する必要があります)`
        );
        
        if (fallbackTest) {
          await testLocalNotification();
          alert(`ローカル通知テスト完了\n\nNote: サーバー側のEdge Functionは後でデプロイ設定を確認してください。`);
        } else {
          throw edgeFunctionError;
        }
      }
    } catch (error) {
      console.error('Error testing FCM notification:', error);
      alert(`FCM通知テストエラー: ${error}`);
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    if (permission === 'granted') {
      onMessageListener()
        .then((payload: any) => {
          console.log('Received foreground message:', payload);
          
          // Show browser notification for foreground messages
          if (payload.notification && Notification.permission === 'granted') {
            const notification = new Notification(
              payload.notification.title || '英単語学習リマインダー',
              {
                body: payload.notification.body || '新しい学習リマインダーがあります',
                icon: payload.notification.image || '/logo192.png',
                badge: '/logo192.png',
                data: payload.data,
                requireInteraction: false,
                tag: 'fcm-foreground-' + Date.now()
              }
            );

            notification.onclick = () => {
              console.log('Foreground notification clicked');
              window.focus();
              notification.close();
              
              // If the notification contains word data, you could navigate to a specific page
              if (payload.data?.word) {
                console.log(`User clicked on notification for word: ${payload.data.word}`);
              }
            };

            // Auto close after 5 seconds
            setTimeout(() => {
              notification.close();
            }, 5000);
          }
        })
        .catch((err) => console.log('Failed to receive message:', err));
    }
  }, [permission]);

  return {
    fcmToken,
    permission,
    isTokenSaved,
    loading,
    requestPermissionAndGetToken,
    saveFCMTokenToDatabase,
    setupFCMNotifications,
    testFCMNotification,
    testLocalNotification,
  };
};