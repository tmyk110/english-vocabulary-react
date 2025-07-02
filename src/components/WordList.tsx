import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Collapse,
  Divider,
  Grid,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  VolumeUp,
  Delete,
  Psychology,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
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
    <Box>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4' component='h2' sx={{ color: 'white' }}>
          登録済み単語一覧
          <Chip
            label={`${words.length}個`}
            color='primary'
            size='small'
            sx={{ ml: 2 }}
          />
        </Typography>
        {words.length > 0 && (
          <Button
            variant='outlined'
            startIcon={showAllMeanings ? <VisibilityOff /> : <Visibility />}
            onClick={toggleAllMeanings}
            sx={{
              color: 'white',
              borderColor: 'white',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.8)',
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            {showAllMeanings ? '全て隠す' : '全て表示'}
          </Button>
        )}
      </Box>

      {loading ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight='200px'
        >
          <CircularProgress />
          <Typography variant='body1' sx={{ ml: 2, color: 'white' }}>
            読み込み中...
          </Typography>
        </Box>
      ) : words.length === 0 ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight='200px'
          flexDirection='column'
        >
          <Typography variant='h6' sx={{ color: 'white' }}>
            まだ単語が登録されていません
          </Typography>
          <Typography variant='body2' sx={{ mt: 1, color: 'rgba(255,255,255,0.8)' }}>
            「単語登録」タブから新しい単語を追加してください
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {words.map((word: VocabularyWord) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={word.id}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    elevation: 4,
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    display='flex'
                    justifyContent='space-between'
                    alignItems='flex-start'
                    mb={2}
                  >
                    <Typography
                      variant='h5'
                      component='h3'
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { color: 'primary.main' },
                      }}
                      onClick={() => toggleMeaning(word.id)}
                    >
                      {word.word}
                    </Typography>
                    <IconButton
                      size='small'
                      onClick={() => toggleMeaning(word.id)}
                      aria-label={
                        visibleMeanings.has(word.id)
                          ? '意味を隠す'
                          : '意味を表示'
                      }
                    >
                      {visibleMeanings.has(word.id) ? (
                        <ExpandLess />
                      ) : (
                        <ExpandMore />
                      )}
                    </IconButton>
                  </Box>

                  <Collapse in={visibleMeanings.has(word.id)}>
                    <Box>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant='body1' color='text.secondary'>
                        {word.meaning}
                      </Typography>
                    </Box>
                  </Collapse>

                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mt: 2, display: 'block' }}
                  >
                    登録日:{' '}
                    {word.dateAdded ||
                      (word.date_added
                        ? new Date(word.date_added).toLocaleDateString()
                        : '')}
                  </Typography>
                </CardContent>

                <CardActions
                  sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}
                >
                  <Box>
                    {isSupported && (
                      <IconButton
                        onClick={() => speak(word.word)}
                        disabled={isSpeaking}
                        color='primary'
                        aria-label='音声再生'
                      >
                        <VolumeUp />
                      </IconButton>
                    )}
                    <IconButton
                      onClick={() => openChatGPT(word.word)}
                      color='secondary'
                      aria-label='ChatGPTで学習'
                    >
                      <Psychology />
                    </IconButton>
                  </Box>
                  <IconButton
                    onClick={() => onDeleteWord(word.id)}
                    color='error'
                    aria-label='削除'
                  >
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
