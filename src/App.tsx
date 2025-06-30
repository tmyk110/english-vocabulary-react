import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import type { VocabularyWord, User, AuthMode } from './types';
import { useVocabularyWords } from './hooks/useVocabularyWords';

function App(): React.JSX.Element {
  const [newWord, setNewWord] = useState<string>('');
  const [newMeaning, setNewMeaning] = useState<string>('');
  const [showReview, setShowReview] = useState<boolean>(false);
  const [dictionaryLoading, setDictionaryLoading] = useState<boolean>(false);
  const [dictionaryResult, setDictionaryResult] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [visibleMeanings, setVisibleMeanings] = useState<Set<number | string>>(
    new Set()
  );
  const [showAllMeanings, setShowAllMeanings] = useState<boolean>(false);

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

  const handleAddWord = async (): Promise<void> => {
    await addVocabularyWord(newWord, newMeaning);
    setNewWord('');
    setNewMeaning('');
  };

  const lookupDictionary = async (): Promise<void> => {
    if (!newWord.trim()) {
      alert('英単語を入力してください');
      return;
    }

    try {
      setDictionaryLoading(true);
      // CORSプロキシを使用してAPIにアクセス
      const response = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(
          `https://api.excelapi.org/dictionary/enja?word=${encodeURIComponent(
            newWord.trim()
          )}`
        )}`
      );

      if (response.ok) {
        const data = await response.json();
        const meaning = data.contents;
        if (meaning && meaning.trim()) {
          setDictionaryResult(meaning.trim());
        } else {
          setDictionaryResult('辞書に登録されていない単語です');
        }
      } else {
        setDictionaryResult('辞書の検索に失敗しました');
      }
    } catch (error) {
      setDictionaryResult(
        '辞書の検索中にエラーが発生しました: ' +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setDictionaryLoading(false);
    }
  };

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
        setShowAuth(false);
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

  const handleLogout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setWords([]);
    } catch (error) {
      alert('ログアウトエラーが発生しました');
    }
  };

  const openChatGPT = (word: string): void => {
    const prompt = encodeURIComponent(`${word}を使った英文例をください`);
    const chatgptUrl = `https://chat.openai.com/?q=${prompt}`;
    window.open(chatgptUrl, '_blank');
  };

  const toggleMeaning = (wordId: number | string): void => {
    setVisibleMeanings((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const toggleAllMeanings = (): void => {
    if (showAllMeanings) {
      setVisibleMeanings(new Set());
      setShowAllMeanings(false);
    } else {
      const allWordIds = new Set(words.map((word) => word.id));
      setVisibleMeanings(allWordIds);
      setShowAllMeanings(true);
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

          {!showAuth ? (
            <div className='auth-welcome'>
              <p>英単語とその意味を登録・管理できる学習アプリです</p>
              <button onClick={() => setShowAuth(true)} className='auth-btn'>
                ログイン / サインアップ
              </button>
            </div>
          ) : (
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
                  <button
                    onClick={() => setAuthMode('login')}
                    className='link-btn'
                  >
                    ログインに戻る
                  </button>
                )}
                <button onClick={() => setShowAuth(false)} className='link-btn'>
                  戻る
                </button>
              </div>
            </div>
          )}
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
          <div className='word-input-section'>
            <h2>新しい単語を登録</h2>
            <div className='input-group'>
              <div className='word-input-container'>
                <input
                  type='text'
                  placeholder='英単語を入力'
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === 'Enter' && handleAddWord()
                  }
                />
                <button
                  onClick={lookupDictionary}
                  disabled={dictionaryLoading || !newWord.trim()}
                  className='dictionary-btn'
                >
                  {dictionaryLoading ? '検索中...' : '辞書で調べる'}
                </button>
              </div>

              {dictionaryResult && (
                <div className='dictionary-result'>
                  <h4>辞書の結果:</h4>
                  <p>{dictionaryResult}</p>
                  <button
                    onClick={() => setNewMeaning(dictionaryResult)}
                    className='use-result-btn'
                  >
                    この意味を使用
                  </button>
                </div>
              )}

              <input
                type='text'
                placeholder='意味を入力'
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === 'Enter' && handleAddWord()
                }
              />
              <button onClick={handleAddWord} disabled={loading}>
                {loading ? '保存中...' : '登録'}
              </button>
            </div>
          </div>
        ) : (
          <div className='word-list-section'>
            <div className='word-list-header'>
              <h2>登録済み単語一覧 ({words.length}個)</h2>
              {words.length > 0 && (
                <button onClick={toggleAllMeanings} className='bulk-toggle-btn'>
                  {showAllMeanings ? '全て隠す' : '全て表示'}
                </button>
              )}
            </div>
            {loading ? (
              <p>読み込み中...</p>
            ) : words.length === 0 ? (
              <p>まだ単語が登録されていません。</p>
            ) : (
              <div className='word-list'>
                {words.map((word: VocabularyWord) => (
                  <div key={word.id} className='word-card'>
                    <div className='word-content'>
                      <h3
                        onClick={() => toggleMeaning(word.id)}
                        className='word-title clickable'
                      >
                        {word.word}
                      </h3>
                      {visibleMeanings.has(word.id) && (
                        <p className='word-meaning'>{word.meaning}</p>
                      )}
                      <small>
                        登録日:{' '}
                        {word.dateAdded ||
                          (word.date_added
                            ? new Date(word.date_added).toLocaleDateString()
                            : '')}
                      </small>
                    </div>
                    <div className='word-actions'>
                      <button
                        onClick={() => toggleMeaning(word.id)}
                        className='meaning-toggle-btn'
                      >
                        {visibleMeanings.has(word.id)
                          ? '意味を隠す'
                          : '意味を表示'}
                      </button>
                      <button
                        onClick={() => openChatGPT(word.word)}
                        className='chatgpt-btn'
                      >
                        ChatGPTで学習
                      </button>
                      <button
                        onClick={() => deleteVocabularyWord(word.id)}
                        className='delete-btn'
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
