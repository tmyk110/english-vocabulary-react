import { useState } from 'react';

export const useDictionary = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const lookupDictionary = async (word: string): Promise<void> => {
    if (!word.trim()) {
      alert('英単語を入力してください');
      return;
    }

    try {
      setLoading(true);
      // CORSプロキシを使用してAPIにアクセス
      const response = await fetch(
        `https://api.allorigins.win/get?url=${encodeURIComponent(
          `https://api.excelapi.org/dictionary/enja?word=${encodeURIComponent(
            word.trim()
          )}`
        )}`
      );

      if (response.ok) {
        const data = await response.json();
        const meaning = data.contents;
        if (meaning && meaning.trim()) {
          setResult(meaning.trim());
        } else {
          setResult('辞書に登録されていない単語です');
        }
      } else {
        setResult('辞書の検索に失敗しました');
      }
    } catch (error) {
      setResult(
        '辞書の検索中にエラーが発生しました: ' +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult('');
  };

  return {
    loading,
    result,
    lookupDictionary,
    clearResult,
  };
};
