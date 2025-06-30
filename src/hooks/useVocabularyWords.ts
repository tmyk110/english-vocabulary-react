import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import type { VocabularyWord, User } from '../types';

interface UseVocabularyWordsReturn {
  words: VocabularyWord[];
  loading: boolean;
  fetchWords: () => Promise<void>;
  addWord: (word: string, meaning: string) => Promise<void>;
  deleteWord: (id: number | string) => Promise<void>;
  setWords: React.Dispatch<React.SetStateAction<VocabularyWord[]>>;
}

export const useVocabularyWords = (
  user: User | null
): UseVocabularyWordsReturn => {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const saveToLocalStorage = useCallback(
    (wordList: VocabularyWord[]): void => {
      if (user) {
        localStorage.setItem(
          `vocabularyWords_${user.id}`,
          JSON.stringify(wordList)
        );
      }
    },
    [user]
  );

  const fetchWords = useCallback(async (): Promise<void> => {
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
  }, [user]);

  const addWord = useCallback(
    async (word: string, meaning: string): Promise<void> => {
      if (!word.trim() || !meaning.trim() || !user) return;

      try {
        setLoading(true);
        const { error } = await supabase
          .from('vocabulary_words')
          .insert([
            {
              word: word.trim(),
              meaning: meaning.trim(),
              user_id: user.id,
            },
          ])
          .select();

        if (error) {
          const newWordObj: VocabularyWord = {
            id: Date.now(),
            word: word.trim(),
            meaning: meaning.trim(),
            dateAdded: new Date().toLocaleDateString(),
          };
          const updatedWords = [...words, newWordObj];
          setWords(updatedWords);
          saveToLocalStorage(updatedWords);
        } else {
          await fetchWords();
        }
      } catch (error) {
        const newWordObj: VocabularyWord = {
          id: Date.now(),
          word: word.trim(),
          meaning: meaning.trim(),
          dateAdded: new Date().toLocaleDateString(),
        };
        const updatedWords = [...words, newWordObj];
        setWords(updatedWords);
        saveToLocalStorage(updatedWords);
      } finally {
        setLoading(false);
      }
    },
    [user, words, saveToLocalStorage, fetchWords]
  );

  const deleteWord = useCallback(
    async (id: number | string): Promise<void> => {
      try {
        setLoading(true);
        const { error } = await supabase
          .from('vocabulary_words')
          .delete()
          .eq('id', id);

        if (error) {
          const updatedWords = words.filter((word) => word.id !== id);
          setWords(updatedWords);
          saveToLocalStorage(updatedWords);
        } else {
          await fetchWords();
        }
      } catch (error) {
        const updatedWords = words.filter((word) => word.id !== id);
        setWords(updatedWords);
        saveToLocalStorage(updatedWords);
      } finally {
        setLoading(false);
      }
    },
    [words, saveToLocalStorage, fetchWords]
  );

  useEffect(() => {
    if (user) {
      fetchWords();
    }
  }, [user, fetchWords]);

  return {
    words,
    loading,
    fetchWords,
    addWord,
    deleteWord,
    setWords,
  };
};
