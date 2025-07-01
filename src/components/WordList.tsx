import React, { useState } from 'react';
import type { VocabularyWord } from '../types';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface WordListProps {
  words: VocabularyWord[];
  loading: boolean;
  onDeleteWord: (id: number | string) => Promise<void>;
}

export const WordList: React.FC<WordListProps> = ({
  words,
  loading,
  onDeleteWord,
}) => {
  const [visibleMeanings, setVisibleMeanings] = useState<Set<number | string>>(
    new Set()
  );
  const [showAllMeanings, setShowAllMeanings] = useState(false);
  const { speak, isSpeaking, isSupported } = useSpeechSynthesis();

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

  return (
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
                  {visibleMeanings.has(word.id) ? '意味を隠す' : '意味を表示'}
                </button>
                {isSupported && (
                  <button
                    onClick={() => speak(word.word)}
                    disabled={isSpeaking}
                    className='speak-btn'
                  >
                    {isSpeaking ? '🔊' : '🔉'}
                  </button>
                )}
                <button
                  onClick={() => openChatGPT(word.word)}
                  className='chatgpt-btn'
                >
                  ChatGPTで学習
                </button>
                <button
                  onClick={() => onDeleteWord(word.id)}
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
  );
};
