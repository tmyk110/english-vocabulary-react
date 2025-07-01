import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import type { AuthMode } from '../types';

interface AuthComponentProps {
  showAuth: boolean;
  onToggleAuth: (show: boolean) => void;
}

export const AuthComponent: React.FC<AuthComponentProps> = ({
  showAuth,
  onToggleAuth,
}) => {
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);

  const handleAuth = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    if (!email || !password) {
      alert('メールアドレスとパスワードを入力してください');
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
        alert(result.error.message);
      } else {
        onToggleAuth(false);
        setEmail('');
        setPassword('');
        if (authMode === 'signup') {
          alert(
            '確認メールを送信しました。メールを確認してアカウントを有効化してください。'
          );
        }
      }
    } catch (error) {
      alert('認証エラーが発生しました');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!showAuth) {
    return (
      <div className='auth-welcome'>
        <p>英単語とその意味を登録・管理できる学習アプリです</p>
        <button onClick={() => onToggleAuth(true)} className='auth-btn'>
          ログイン / サインアップ
        </button>
      </div>
    );
  }

  return (
    <div className='auth-form'>
      <h2>{authMode === 'login' ? 'ログイン' : 'サインアップ'}</h2>
      <form onSubmit={handleAuth}>
        <input
          type='email'
          placeholder='メールアドレス'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type='password'
          placeholder='パスワード'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type='submit' disabled={authLoading}>
          {authLoading
            ? '処理中...'
            : authMode === 'login'
            ? 'ログイン'
            : 'サインアップ'}
        </button>
      </form>

      <div className='auth-switch'>
        {authMode === 'login' ? (
          <div className='tooltip-container'>
            <button
              className='link-btn disabled'
              disabled
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              アカウントを作成
            </button>
            {showTooltip && (
              <div className='tooltip'>
                現在、新規ユーザーの登録を一時的に停止しております
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => setAuthMode('login')} className='link-btn'>
            ログインに戻る
          </button>
        )}
        <button onClick={() => onToggleAuth(false)} className='link-btn'>
          戻る
        </button>
      </div>
    </div>
  );
};
