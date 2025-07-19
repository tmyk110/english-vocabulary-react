import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import type { VocabularyWord } from '../types';

interface WordEditDialogProps {
  open: boolean;
  word: VocabularyWord | null;
  onClose: () => void;
  onSave: (id: number | string, newWord: string, newMeaning: string, newExample?: string) => Promise<void>;
  loading: boolean;
}

const WordEditDialog: React.FC<WordEditDialogProps> = ({
  open,
  word,
  onClose,
  onSave,
  loading,
}) => {
  const [editedWord, setEditedWord] = useState('');
  const [editedMeaning, setEditedMeaning] = useState('');
  const [editedExample, setEditedExample] = useState('');

  useEffect(() => {
    if (word) {
      setEditedWord(word.word);
      setEditedMeaning(word.meaning);
      setEditedExample(word.example || '');
    }
  }, [word]);

  const handleSave = async (): Promise<void> => {
    if (!word || !editedWord.trim() || !editedMeaning.trim()) return;
    
    await onSave(word.id, editedWord.trim(), editedMeaning.trim(), editedExample.trim());
    onClose();
  };

  const handleClose = (): void => {
    onClose();
    // ダイアログを閉じる際に編集内容をリセット
    if (word) {
      setEditedWord(word.word);
      setEditedMeaning(word.meaning);
      setEditedExample(word.example || '');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <EditIcon sx={{ mr: 1, color: 'primary.main' }} />
        単語を編集
      </DialogTitle>
      
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              英単語
            </Typography>
            <TextField
              fullWidth
              value={editedWord}
              onChange={(e) => setEditedWord(e.target.value)}
              placeholder="編集する英単語を入力"
              variant="outlined"
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              日本語の意味
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editedMeaning}
              onChange={(e) => setEditedMeaning(e.target.value)}
              placeholder="編集する意味を入力"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
              例文（任意）
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editedExample}
              onChange={(e) => setEditedExample(e.target.value)}
              placeholder="英語の例文を入力（任意）"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          sx={{ minWidth: 100 }}
        >
          キャンセル
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          disabled={!editedWord.trim() || !editedMeaning.trim() || loading}
          sx={{ minWidth: 100 }}
        >
          {loading ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WordEditDialog;