import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

function App() {
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryResult, setDictionaryResult] = useState('');
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // 認証状態を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setAuthLoading(false);
        if (session?.user) {
          fetchWords();
        }
      }
    );

    // 初期認証状態をチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) {
        fetchWords();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchWords = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('user_id', user.id)
        .order('date_added', { ascending: false });

      if (error) {
        const savedWords = localStorage.getItem(`vocabularyWords_${user.id}`);
        if (savedWords) {
          setWords(JSON.parse(savedWords));
        }
      } else {
        setWords(data);
      }
    } catch (error) {
      const savedWords = localStorage.getItem(`vocabularyWords_${user.id}`);
      if (savedWords) {
        setWords(JSON.parse(savedWords));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalStorage = (wordList) => {
    if (user) {
      localStorage.setItem(`vocabularyWords_${user.id}`, JSON.stringify(wordList));
    }
  };

  const addWord = async () => {
    if (newWord.trim() && newMeaning.trim()) {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('vocabulary_words')
          .insert([
            {
              word: newWord.trim(),
              meaning: newMeaning.trim(),
              user_id: user.id
            }
          ])
          .select();

        if (error) {
          const newWordObj = {
            id: Date.now(),
            word: newWord.trim(),
            meaning: newMeaning.trim(),
            dateAdded: new Date().toLocaleDateString()
          };
          const updatedWords = [...words, newWordObj];
          setWords(updatedWords);
          saveToLocalStorage(updatedWords);
        } else {
          await fetchWords();
        }
        
        setNewWord('');
        setNewMeaning('');
      } catch (error) {
        const newWordObj = {
          id: Date.now(),
          word: newWord.trim(),
          meaning: newMeaning.trim(),
          dateAdded: new Date().toLocaleDateString()
        };
        const updatedWords = [...words, newWordObj];
        setWords(updatedWords);
        saveToLocalStorage(updatedWords);
        setNewWord('');
        setNewMeaning('');
      } finally {
        setLoading(false);
      }
    }
  };

  const lookupDictionary = async () => {
    if (!newWord.trim()) {
      alert('英単語を入力してください');
      return;
    }

    try {
      setDictionaryLoading(true);
      // CORSプロキシを使用してAPIにアクセス
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.excelapi.org/dictionary/enja?word=${encodeURIComponent(newWord.trim())}`)}`);
      
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
      setDictionaryResult('辞書の検索中にエラーが発生しました: ' + error.message);
    } finally {
      setDictionaryLoading(false);
    }
  };

  const handleAuth = async (e) => {
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
          alert('確認メールを送信しました。メールを確認してアカウントを有効化してください。');
        }
      }
    } catch (error) {
      alert('認証エラーが発生しました');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setWords([]);
    } catch (error) {
      alert('ログアウトエラーが発生しました');
    }
  };

  const deleteWord = async (id) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('vocabulary_words')
        .delete()
        .eq('id', id);

      if (error) {
        const updatedWords = words.filter(word => word.id !== id);
        setWords(updatedWords);
        saveToLocalStorage(updatedWords);
      } else {
        await fetchWords();
      }
    } catch (error) {
      const updatedWords = words.filter(word => word.id !== id);
      setWords(updatedWords);
      saveToLocalStorage(updatedWords);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>英単語学習アプリ</h1>
          <p>読み込み中...</p>
        </header>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>英単語学習アプリ</h1>
          
          {!showAuth ? (
            <div className="auth-welcome">
              <p>英単語とその意味を登録・管理できる学習アプリです</p>
              <button onClick={() => setShowAuth(true)} className="auth-btn">
                ログイン / サインアップ
              </button>
            </div>
          ) : (
            <div className="auth-form">
              <h2>{authMode === 'login' ? 'ログイン' : 'サインアップ'}</h2>
              <form onSubmit={handleAuth}>
                <input
                  type="email"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" disabled={authLoading}>
                  {authLoading ? '処理中...' : (authMode === 'login' ? 'ログイン' : 'サインアップ')}
                </button>
              </form>
              
              <div className="auth-switch">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="link-btn"
                >
                  {authMode === 'login' ? 'アカウントを作成' : 'ログインに戻る'}
                </button>
                <button onClick={() => setShowAuth(false)} className="link-btn">
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
    <div className="App">
      <header className="App-header">
        <div className="header-top">
          <h1>英単語学習アプリ</h1>
          <div className="user-info">
            <span>{user.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              ログアウト
            </button>
          </div>
        </div>
        
        <div className="nav-buttons">
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
          <div className="word-input-section">
            <h2>新しい単語を登録</h2>
            <div className="input-group">
              <div className="word-input-container">
                <input
                  type="text"
                  placeholder="英単語を入力"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addWord()}
                />
                <button 
                  onClick={lookupDictionary} 
                  disabled={dictionaryLoading || !newWord.trim()}
                  className="dictionary-btn"
                >
                  {dictionaryLoading ? '検索中...' : '辞書で調べる'}
                </button>
              </div>
              
              {dictionaryResult && (
                <div className="dictionary-result">
                  <h4>辞書の結果:</h4>
                  <p>{dictionaryResult}</p>
                  <button 
                    onClick={() => setNewMeaning(dictionaryResult)}
                    className="use-result-btn"
                  >
                    この意味を使用
                  </button>
                </div>
              )}
              
              <input
                type="text"
                placeholder="意味を入力"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addWord()}
              />
              <button onClick={addWord} disabled={loading}>
                {loading ? '保存中...' : '登録'}
              </button>
            </div>
          </div>
        ) : (
          <div className="word-list-section">
            <h2>登録済み単語一覧 ({words.length}個)</h2>
            {loading ? (
              <p>読み込み中...</p>
            ) : words.length === 0 ? (
              <p>まだ単語が登録されていません。</p>
            ) : (
              <div className="word-list">
                {words.map((word) => (
                  <div key={word.id} className="word-card">
                    <div className="word-content">
                      <h3>{word.word}</h3>
                      <p>{word.meaning}</p>
                      <small>登録日: {word.dateAdded || new Date(word.date_added).toLocaleDateString()}</small>
                    </div>
                    <button 
                      onClick={() => deleteWord(word.id)}
                      className="delete-btn"
                    >
                      削除
                    </button>
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
