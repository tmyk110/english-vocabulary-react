import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface EnvironmentCheckProps {
  open: boolean;
  onClose: () => void;
}

const EnvironmentCheck: React.FC<EnvironmentCheckProps> = ({ open, onClose }) => {
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  const missingVars: string[] = [];
  
  if (!supabaseUrl) missingVars.push('REACT_APP_SUPABASE_URL');
  if (!supabaseKey) missingVars.push('REACT_APP_SUPABASE_ANON_KEY');

  if (missingVars.length === 0) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#f5f5f5',
          border: '2px solid #d32f2f',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        backgroundColor: '#d32f2f', 
        color: 'white',
        mb: 2
      }}>
        <ErrorIcon sx={{ mr: 1 }} />
        環境変数設定エラー
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>アプリケーションを実行するために必要な環境変数が設定されていません</AlertTitle>
        </Alert>

        <Typography variant="h6" gutterBottom>
          不足している環境変数:
        </Typography>
        
        <Box component="ul" sx={{ mt: 1, mb: 2 }}>
          {missingVars.map((varName) => (
            <Typography component="li" key={varName} sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
              {varName}
            </Typography>
          ))}
        </Box>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          解決方法:
        </Typography>
        
        <Box sx={{ backgroundColor: '#f0f0f0', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography variant="body2" component="div">
            <strong>1. .envファイルを作成または編集してください</strong>
            <br />
            プロジェクトのルートディレクトリに <code>.env</code> ファイルを作成し、以下の環境変数を設定してください：
          </Typography>
        </Box>

        <Box sx={{ backgroundColor: '#263238', color: '#fff', p: 2, borderRadius: 1, mb: 2 }}>
          <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace' }}>
{`REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here`}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ mb: 2 }}>
          <strong>2. Supabaseの設定値を取得してください</strong>
          <br />
          • Supabaseダッシュボード → プロジェクト選択 → Settings → API
          <br />
          • Project URLとanon public keyをコピーして上記の値に設定
        </Typography>

        <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 'bold' }}>
          <strong>3. 開発サーバーを再起動してください</strong>
          <br />
          環境変数を変更した後は、開発サーバーの再起動が必要です。
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button 
          onClick={onClose} 
          variant="contained" 
          color="primary"
          sx={{ minWidth: 120 }}
        >
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EnvironmentCheck;