import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Tooltip,
  Stack,
} from '@mui/material';
import { Login, PersonAdd } from '@mui/icons-material';
import { supabase } from '../supabaseClient';
import type { AuthMode } from '../types';

interface AuthProps {
  showAuth: boolean;
  onToggleAuth: (show: boolean) => void;
}

export const Auth: React.FC<AuthProps> = ({
  showAuth,
  onToggleAuth,
}) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAuth = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      setAuthLoading(true);
      let result;

      if (authMode === 'login') {
        result = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else {
        result = await supabase.auth.signUp({
          email,
          password,
        });
      }

      if (result.error) {
        setError(result.error.message);
      } else {
        onToggleAuth(false);
        setEmail('');
        setPassword('');
        if (authMode === 'signup') {
          setSuccess(
            '確認メールを送信しました。メールを確認してアカウントを有効化してください。'
          );
        }
      }
    } catch (error) {
      setError('認証エラーが発生しました');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: AuthMode | null
  ): void => {
    if (newMode !== null) {
      setAuthMode(newMode);
      setError(null);
      setSuccess(null);
    }
  };

  if (!showAuth) {
    return (
      <Box textAlign='center' sx={{ mt: 4 }}>
        <Typography variant='h6' paragraph color='text.secondary'>
          英単語とその意味を登録・管理できる学習アプリです
        </Typography>
        <Button
          variant='contained'
          size='large'
          onClick={() => onToggleAuth(true)}
          startIcon={<Login />}
        >
          ログイン / サインアップ
        </Button>
      </Box>
    );
  }

  return (
    <Box maxWidth='sm' width='100%' sx={{ mt: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant='h4'
            component='h2'
            gutterBottom
            textAlign='center'
          >
            {authMode === 'login' ? 'ログイン' : 'サインアップ'}
          </Typography>

          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={authMode}
              exclusive
              onChange={handleModeChange}
              aria-label='認証モード'
            >
              <ToggleButton value='login' aria-label='ログイン'>
                <Login sx={{ mr: 1 }} />
                ログイン
              </ToggleButton>
              <Tooltip title='現在、新規ユーザーの登録を一時的に停止しております'>
                <span>
                  <ToggleButton
                    value='signup'
                    disabled
                    aria-label='サインアップ'
                  >
                    <PersonAdd sx={{ mr: 1 }} />
                    サインアップ
                  </ToggleButton>
                </span>
              </Tooltip>
            </ToggleButtonGroup>
          </Box>

          {error && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity='success' sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component='form' onSubmit={handleAuth}>
            <Stack spacing={3}>
              <TextField
                type='email'
                label='メールアドレス'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                variant='outlined'
              />
              <TextField
                type='password'
                label='パスワード'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                variant='outlined'
              />
              <Button
                type='submit'
                variant='contained'
                size='large'
                disabled={authLoading}
                fullWidth
                startIcon={
                  authLoading ? (
                    <CircularProgress size={20} />
                  ) : authMode === 'login' ? (
                    <Login />
                  ) : (
                    <PersonAdd />
                  )
                }
              >
                {authLoading
                  ? '処理中...'
                  : authMode === 'login'
                  ? 'ログイン'
                  : 'サインアップ'}
              </Button>
            </Stack>
          </Box>

          <Box textAlign='center' sx={{ mt: 2 }}>
            <Button variant='text' onClick={() => onToggleAuth(false)}>
              戻る
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
