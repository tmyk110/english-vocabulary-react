import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Paper,
  Divider,
  IconButton,
  CircularProgress,
  Stack
} from '@mui/material';
import {
  VolumeUp,
  Search,
  Add,
  ContentCopy
} from '@mui/icons-material';
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
    if (!newWord.trim() || !newMeaning.trim()) return;
    await onAddWord(newWord, newMeaning);
    setNewWord('');
    setNewMeaning('');
  };

  const handleLookupDictionary = async (): Promise<void> => {
    await lookupDictionary(newWord);
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddWord();
    }
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'white' }}>
        新しい単語を登録
      </Typography>
      
      <Card elevation={2}>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" gutterBottom>
                英単語
              </Typography>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <TextField
                  fullWidth
                  placeholder="英単語を入力"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyPress={handleKeyPress}
                  variant="outlined"
                />
                <IconButton
                  onClick={handleLookupDictionary}
                  disabled={dictionaryLoading || !newWord.trim()}
                  color="primary"
                  aria-label="辞書で調べる"
                >
                  {dictionaryLoading ? <CircularProgress size={24} /> : <Search />}
                </IconButton>
                {isSupported && (
                  <IconButton
                    onClick={() => speak(newWord)}
                    disabled={isSpeaking || !newWord.trim()}
                    color="secondary"
                    aria-label="音声再生"
                  >
                    <VolumeUp />
                  </IconButton>
                )}
              </Stack>
            </Box>

            {dictionaryResult && (
              <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="h6" gutterBottom>
                  辞書の結果
                </Typography>
                <Typography variant="body1" paragraph>
                  {dictionaryResult}
                </Typography>
                <Button
                  startIcon={<ContentCopy />}
                  onClick={() => setNewMeaning(dictionaryResult)}
                  variant="outlined"
                  size="small"
                >
                  この意味を使用
                </Button>
              </Paper>
            )}

            <Divider />

            <Box>
              <Typography variant="h6" gutterBottom>
                意味
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="意味を入力"
                value={newMeaning}
                onChange={(e) => setNewMeaning(e.target.value)}
                onKeyPress={handleKeyPress}
                variant="outlined"
              />
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={handleAddWord}
              disabled={loading || !newWord.trim() || !newMeaning.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <Add />}
              fullWidth
            >
              {loading ? '保存中...' : '単語を登録'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};