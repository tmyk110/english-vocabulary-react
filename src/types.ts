export interface VocabularyWord {
  id: number | string;
  word: string;
  meaning: string;
  user_id?: string;
  date_added?: string;
  dateAdded?: string;
}

export interface User {
  id: string;
  email?: string;
}

export type AuthMode = 'login' | 'signup';