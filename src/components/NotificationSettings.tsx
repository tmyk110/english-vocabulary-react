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
  TextField,
  Grid,
  Divider,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CloudQueue as FirebaseIcon,
} from '@mui/icons-material';
import { useNotifications } from '../hooks/useNotifications';
import { useFCMNotifications } from '../hooks/useFCMNotifications';
import { supabase } from '../supabaseClient';
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
    isSubscribed,
  } = useNotifications();

  const {
    fcmToken,
    permission: fcmPermission,
    isTokenSaved,
    loading: fcmLoading,
    setupFCMNotifications,
    testFCMNotification,
  } = useFCMNotifications();

  const [useNewFCM, setUseNewFCM] = React.useState(true);
  const [notificationTime, setNotificationTime] = React.useState('10:00');
  const [isTimeLoading, setIsTimeLoading] = React.useState(false);

  // Load notification settings on component mount
  React.useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data: settings } = await supabase
          .from('notification_settings')
          .select('notification_time')
          .eq('user_id', user.user.id)
          .single();

        if (settings?.notification_time) {
          // Convert "HH:MM:SS" to "HH:MM" for input[type="time"]
          const timeStr = settings.notification_time.substring(0, 5);
          setNotificationTime(timeStr);
        }
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    };

    loadNotificationSettings();
  }, []);

  const handleTimeChange = async (newTime: string) => {
    setNotificationTime(newTime);
    setIsTimeLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Upsert notification settings
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: user.user.id,
          notification_time: `${newTime}:00`, // Convert "HH:MM" to "HH:MM:SS"
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving notification time:', error);
        alert('通知時刻の保存に失敗しました。');
      } else {
        console.log('Notification time saved:', newTime);
      }
    } catch (error) {
      console.error('Error updating notification time:', error);
      alert('通知時刻の更新に失敗しました。');
    } finally {
      setIsTimeLoading(false);
    }
  };

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
    scheduleNotification(words);
  };





  const handleSetupFCM = async () => {
    console.log('Setting up FCM notifications...');
    try {
      const success = await setupFCMNotifications();
      console.log('setupFCMNotifications result:', success);
      
      if (success) {
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const message = isDevelopment 
          ? 'FCMプッシュ通知の設定が完了しました！\n\n開発環境ではモックトークンを使用しています。\n本番環境（HTTPS）では実際の通知が送信されます。'
          : 'FCMプッシュ通知の設定が完了しました！\n毎日10時に学習リマインダーが届きます。';
        alert(message);
      } else {
        alert('FCMプッシュ通知の設定に失敗しました。\nブラウザの通知許可を確認してください。');
      }
    } catch (error) {
      console.error('FCM setup error:', error);
      alert(`FCM設定エラー: ${error}`);
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
          毎日指定した時刻に登録した英単語からランダムで1つ選んで学習リマインダーを送信します
        </Typography>

        {/* Notification Time Setting */}
        <Box sx={{ my: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            通知時刻設定:
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="通知時刻"
                type="time"
                value={notificationTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                disabled={isTimeLoading}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                helperText="毎日この時刻に学習リマインダーが送信されます"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Alert severity="info" sx={{ mb: 0 }}>
                <Typography variant="body2">
                  現在の設定: <strong>{notificationTime}</strong><br/>
                  {isTimeLoading ? '保存中...' : '変更は自動的に保存されます'}
                </Typography>
              </Alert>
              {isTokenSaved && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      const now = new Date();
                      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                      if (window.confirm(`現在時刻 ${currentTime} でテスト通知を送信しますか？\n\n設定時刻: ${notificationTime}\n現在時刻: ${currentTime}\n\nスケジューラーのテストができます。`)) {
                        testFCMNotification();
                      }
                    }}
                    size="small"
                    disabled={fcmLoading}
                  >
                    🕐 今すぐテスト送信
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Notification System Selector */}
        <Box sx={{ my: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            通知システム選択:
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={useNewFCM}
                onChange={(e) => setUseNewFCM(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {useNewFCM ? (
                  <>
                    <FirebaseIcon color="primary" />
                    <Typography variant="body2">
                      Firebase Cloud Messaging (推奨)
                    </Typography>
                  </>
                ) : (
                  <>
                    <NotificationsIcon />
                    <Typography variant="body2">
                      Web Push (従来方式)
                    </Typography>
                  </>
                )}
              </Box>
            }
          />
          {useNewFCM && (
            <>
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  FCMを使用すると、より確実にプッシュ通知が届きます。Firebaseプロジェクトの設定が必要です。
                </Typography>
              </Alert>
              {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>開発環境（localhost）</strong>: FCMはHTTPS環境でのみ完全に動作します。
                    開発時はモックトークンを使用してUIテストが可能です。
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Box>

        <Box sx={{ my: 2 }}>
          <Typography variant="body2" gutterBottom>
            通知状況:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            {useNewFCM ? (
              <>
                <Chip 
                  label={`FCM許可: ${fcmPermission === 'granted' ? '許可済み' : fcmPermission === 'denied' ? '拒否' : '未設定'}`}
                  color={fcmPermission === 'granted' ? 'success' : fcmPermission === 'denied' ? 'error' : 'warning'}
                  size="small"
                />
                <Chip 
                  label={`FCMトークン: ${fcmToken ? '取得済み' : '未取得'}`}
                  color={fcmToken ? 'success' : 'default'}
                  size="small"
                />
                <Chip 
                  label={`DB保存: ${isTokenSaved ? '保存済み' : '未保存'}`}
                  color={isTokenSaved ? 'success' : 'default'}
                  size="small"
                />
              </>
            ) : (
              <>
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
                  label={`プッシュ通知: ${isSubscribed ? 'サブスクリプション済み' : '未設定'}`}
                  color={isSubscribed ? 'success' : 'default'}
                  size="small"
                />
              </>
            )}
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

        {((useNewFCM && fcmPermission === 'granted') || (!useNewFCM && permission === 'granted')) && words.length > 0 && (
          <>
            <Alert severity="success" sx={{ mt: 2 }}>
              {useNewFCM 
                ? (isTokenSaved 
                    ? `✅ FCMプッシュ通知が設定されました！毎日${notificationTime}に学習リマインダーが届きます。`
                    : 'FCM通知許可は完了しています。下のボタンでプッシュ通知を設定してください。')
                : (isSubscribed 
                    ? `✅ プッシュ通知が設定されました！毎日${notificationTime}に学習リマインダーが届きます。`
                    : '通知許可は完了しています。下のボタンでプッシュ通知を設定してください。')
              }
            </Alert>
            {((useNewFCM && !isTokenSaved) || (!useNewFCM && !isSubscribed)) && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <strong>macOSの場合：</strong>システム設定 → 通知 → {navigator.userAgent.includes('Chrome') ? 'Google Chrome' : 'ブラウザ'} で通知が有効になっているか確認してください。
              </Alert>
            )}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {useNewFCM ? (
                <>
                  <Button
                    variant="contained"
                    onClick={handleSetupFCM}
                    startIcon={<FirebaseIcon />}
                    disabled={isTokenSaved || fcmLoading}
                    color="primary"
                  >
                    {fcmLoading 
                      ? 'FCM設定中...' 
                      : isTokenSaved 
                        ? 'FCM通知設定完了' 
                        : 'FCM通知を設定する'}
                  </Button>
                  {isTokenSaved && (
                    <Button
                      variant="outlined"
                      onClick={testFCMNotification}
                      startIcon={<FirebaseIcon />}
                      color="success"
                    >
                      通知テスト
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    onClick={handleTestNotification}
                    startIcon={<NotificationsIcon />}
                    disabled={isSubscribed}
                  >
                    {isSubscribed ? 'プッシュ通知設定完了' : 'プッシュ通知を設定する'}
                  </Button>
                  {isSubscribed && (
                    <Button
                      variant="outlined"
                      onClick={() => alert('従来方式の通知テストは開発中です。\nFCM方式をご利用ください。')}
                      color="success"
                    >
                      通知テスト
                    </Button>
                  )}
                </>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;