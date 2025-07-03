import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Box,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';
import type { VocabularyWord } from '../types';

interface NotificationSettingsProps {
  words: VocabularyWord[];
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ words }) => {
  const {
    isSupported,
    permission,
    requestPermission,
    scheduleNotification,
    isServiceWorkerRegistered,
  } = useNotifications();

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted' && words.length > 0) {
      await scheduleNotification(words);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      await handleEnableNotifications();
    }
  };

  const handleTestNotification = () => {
    console.log('Test notification button clicked');
    console.log('Current state:', { permission, wordsLength: words.length, isSupported, isServiceWorkerRegistered });
    
    // 詳細な診断情報
    console.log('Browser notification permission:', Notification.permission);
    console.log('Notification constructor available:', typeof Notification !== 'undefined');
    console.log('User agent:', navigator.userAgent);
    
    scheduleNotification(words);
  };

  const handleSystemDiagnostics = () => {
    const diagnostics = {
      notificationPermission: Notification.permission,
      notificationSupported: 'Notification' in window,
      serviceWorkerSupported: 'serviceWorker' in navigator,
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
      timestamp: new Date().toISOString()
    };
    
    console.log('System Diagnostics:', diagnostics);
    
    // 簡単な通知テスト
    try {
      const testNotification = new Notification('システム診断テスト', {
        body: 'この通知が表示されれば、基本的な通知機能は動作しています。',
        icon: '/logo192.png'
      });
      
      testNotification.onshow = () => {
        console.log('診断テスト通知が表示されました');
      };
      
      testNotification.onerror = (error) => {
        console.error('診断テスト通知でエラー:', error);
      };
      
    } catch (error) {
      console.error('診断テスト通知の作成に失敗:', error);
      alert(`通知作成エラー: ${error}`);
    }
  };

  const handleSimpleTest = () => {
    if (words.length === 0) {
      alert('まず英単語を登録してください。');
      return;
    }

    const randomWord = words[Math.floor(Math.random() * words.length)];
    console.log('Simple test notification for word:', randomWord);
    
    try {
      const notification = new Notification('英単語テスト通知', {
        body: `単語: ${randomWord.word}\n意味: ${randomWord.meaning}`,
        icon: '/logo192.png'
      });
      
      notification.onshow = () => {
        console.log('✅ シンプルテスト通知が表示されました！');
      };
      
      notification.onerror = (error) => {
        console.error('シンプルテスト通知でエラー:', error);
      };
    } catch (error) {
      console.error('シンプルテスト通知の作成に失敗:', error);
    }
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { color: 'success' as const, text: '許可済み' };
      case 'denied':
        return { color: 'error' as const, text: '拒否' };
      default:
        return { color: 'warning' as const, text: '未設定' };
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            プッシュ通知
          </Typography>
          <Alert severity="warning">
            お使いのブラウザはプッシュ通知をサポートしていません。
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const permissionStatus = getPermissionStatus();

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <NotificationsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          プッシュ通知設定
        </Typography>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          毎日10時に登録した英単語からランダムで1つ選んで学習リマインダーを送信します
        </Typography>

        <Box sx={{ my: 2 }}>
          <Typography variant="body2" gutterBottom>
            通知状況:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip 
              label={`通知許可: ${permissionStatus.text}`}
              color={permissionStatus.color}
              size="small"
            />
            <Chip 
              label={`Service Worker: ${isServiceWorkerRegistered ? '登録済み' : '未登録'}`}
              color={isServiceWorkerRegistered ? 'success' : 'warning'}
              size="small"
            />
            <Chip 
              label={`登録単語数: ${words.length}個`}
              color={words.length > 0 ? 'info' : 'default'}
              size="small"
            />
          </Box>
        </Box>

        {permission === 'denied' ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            通知が拒否されています。ブラウザの設定から通知を許可してください。
          </Alert>
        ) : null}

        {words.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            通知を有効にするには、まず英単語を登録してください。
          </Alert>
        ) : null}

        <FormControlLabel
          control={
            <Switch
              checked={permission === 'granted'}
              onChange={(e) => handleToggleNotifications(e.target.checked)}
              disabled={words.length === 0}
            />
          }
          label="毎日の学習リマインダーを有効にする"
        />

        {permission !== 'granted' && words.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleEnableNotifications}
              startIcon={<NotificationsIcon />}
            >
              通知を許可する
            </Button>
          </Box>
        )}

        {permission === 'granted' && words.length > 0 && (
          <>
            <Alert severity="success" sx={{ mt: 2 }}>
              通知が有効になりました！毎日10時に学習リマインダーが届きます。
            </Alert>
            <Alert severity="info" sx={{ mt: 1 }}>
              <strong>macOSの場合：</strong>システム設定 → 通知 → {navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'ブラウザ'} で通知が有効になっているか確認してください。<br />
              <strong>集中モード：</strong>集中モードまたはおやすみモードがオンになっていると通知が表示されません。
            </Alert>
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={handleTestNotification}
                startIcon={<NotificationsIcon />}
                size="small"
              >
                テスト通知を送信
              </Button>
              <Button
                variant="contained"
                onClick={handleSimpleTest}
                size="small"
                color="primary"
              >
                シンプルテスト
              </Button>
              <Button
                variant="text"
                onClick={handleSystemDiagnostics}
                size="small"
                color="secondary"
              >
                システム診断
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;