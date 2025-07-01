import React, { useState } from 'react';
import { useDictionary } from '../hooks/useDictionary';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface WordRegistrationProps {
  onAddWord: (word: string, meaning: string) => Promise<void>;
  loading: boolean;
}

export const WordRegistration: React.FC<WordRegistrationProps> = ({
  onAddWord,
  loading,
}) => {
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');

  const {
    loading: dictionaryLoading,
    result: dictionaryResult,
    lookupDictionary,
  } = useDictionary();

  const { speak, isSpeaking, isSupported } = useSpeechSynthesis();

  const handleAddWord = async (): Promise<void> => {
    await onAddWord(newWord, newMeaning);
    setNewWord('');
    setNewMeaning('');
  };

  const handleLookupDictionary = async (): Promise<void> => {
    await lookupDictionary(newWord);
  };

  return (
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
            onClick={handleLookupDictionary}
            disabled={dictionaryLoading || !newWord.trim()}
            className='dictionary-btn'
          >
            {dictionaryLoading ? '検索中...' : '辞書で調べる'}
          </button>
          {isSupported && (
            <button
              onClick={() => speak(newWord)}
              disabled={isSpeaking || !newWord.trim()}
              className='speak-btn'
            >
              {isSpeaking ? '🔊' : '🔉'}
            </button>
          )}
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
  );
};