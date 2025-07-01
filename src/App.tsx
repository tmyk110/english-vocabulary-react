import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import type { User } from './types';
import { useVocabularyWords } from './hooks/useVocabularyWords';
import { AuthComponent } from './components/AuthComponent';
import { WordRegistration } from './components/WordRegistration';
import { WordList } from './components/WordList';

function App(): React.JSX.Element {
  const [showReview, setShowReview] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // カスタムフックを使用して単語関連の状態と操作を管理
  const {
    words,
    loading,
    addWord: addVocabularyWord,
    deleteWord: deleteVocabularyWord,
    setWords,
  } = useVocabularyWords(user);

  useEffect(() => {
    // 認証状態を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // 初期認証状態をチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAddWord = async (
    word: string,
    meaning: string
  ): Promise<void> => {
    await addVocabularyWord(word, meaning);
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setWords([]);
    } catch (error) {
      alert('ログアウトエラーが発生しました');
    }
  };

  if (authLoading) {
    return (
      <div className='App'>
        <header className='App-header'>
          <h1>英単語学習アプリ</h1>
          <p>読み込み中...</p>
        </header>
      </div>
    );
  }

  if (!user) {
    return (
      <div className='App'>
        <header className='App-header'>
          <h1>英単語学習アプリ</h1>
          <AuthComponent showAuth={showAuth} onToggleAuth={setShowAuth} />
        </header>
      </div>
    );
  }

  return (
    <div className='App'>
      <header className='App-header'>
        <div className='header-top'>
          <h1>英単語学習アプリ</h1>
          <div className='user-info'>
            <span>{user.email}</span>
            <button onClick={handleLogout} className='logout-btn'>
              ログアウト
            </button>
          </div>
        </div>

        <div className='nav-buttons'>
          <button
            onClick={() => setShowReview(false)}
            className={!showReview ? 'active' : ''}
          >
            単語登録
          </button>
          <button
            onClick={() => setShowReview(true)}
            className={showReview ? 'active' : ''}
          >
            単語一覧
          </button>
        </div>

        {!showReview ? (
          <WordRegistration onAddWord={handleAddWord} loading={loading} />
        ) : (
          <WordList
            words={words}
            loading={loading}
            onDeleteWord={deleteVocabularyWord}
          />
        )}
      </header>
    </div>
  );
}

export default App;
