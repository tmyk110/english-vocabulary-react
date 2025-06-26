import React, { useState, useEffect } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

function App() {
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWords();
  }, []);

  const fetchWords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vocabulary_words')
        .select('*')
        .order('date_added', { ascending: false });

      if (error) {
        const savedWords = localStorage.getItem('vocabularyWords');
        if (savedWords) {
          setWords(JSON.parse(savedWords));
        }
      } else {
        setWords(data);
      }
    } catch (error) {
      const savedWords = localStorage.getItem('vocabularyWords');
      if (savedWords) {
        setWords(JSON.parse(savedWords));
      }
    } finally {
      setLoading(false);
    }
  };

  const saveToLocalStorage = (wordList) => {
    localStorage.setItem('vocabularyWords', JSON.stringify(wordList));
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
              meaning: newMeaning.trim()
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>英単語学習アプリ</h1>
        
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
              <input
                type="text"
                placeholder="英単語を入力"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addWord()}
              />
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
