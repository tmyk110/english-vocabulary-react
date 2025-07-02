import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { AccountCircle, Logout } from '@mui/icons-material';
import { supabase } from './supabaseClient';
import { theme } from './theme';
import type { User } from './types';
import { useVocabularyWords } from './hooks/useVocabularyWords';
import { Auth } from './components/Auth';
import { WordRegistration } from './components/WordRegistration';
import { WordList } from './components/WordList';

function App(): React.JSX.Element {
  const [showReview, setShowReview] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // カスタムフックを使用して単語関連の状態と操作を管理
  const {
    words,
    loading,
    addWord: addVocabularyWord,
    deleteWord: deleteVocabularyWord,
    setWords,
  } = useVocabularyWords(user);

  useEffect(() => {
    // 認証状態を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // 初期認証状態をチェック
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAddWord = async (
    word: string,
    meaning: string
  ): Promise<void> => {
    await addVocabularyWord(word, meaning);
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      setWords([]);
      setAnchorEl(null);
    } catch (error) {
      alert('ログアウトエラーが発生しました');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
  };

  const handleTabChange = (
    event: React.SyntheticEvent,
    newValue: number
  ): void => {
    setShowReview(newValue === 1);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {authLoading ? (
        <Box
          display='flex'
          justifyContent='center'
          alignItems='center'
          minHeight='100vh'
          flexDirection='column'
          sx={{ bgcolor: 'background.default' }}
        >
          <CircularProgress />
          <Typography variant='h6' sx={{ mt: 2 }}>
            読み込み中...
          </Typography>
        </Box>
      ) : !user ? (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
          <Container maxWidth='md'>
            <Box
              display='flex'
              flexDirection='column'
              alignItems='center'
              justifyContent='center'
              minHeight='100vh'
            >
              <Typography variant='h3' component='h1' gutterBottom>
                英単語学習アプリ
              </Typography>
              <Auth showAuth={showAuth} onToggleAuth={setShowAuth} />
            </Box>
          </Container>
        </Box>
      ) : (
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
          <AppBar position='static'>
            <Toolbar>
              <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
                英単語学習アプリ
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant='body2' sx={{ mr: 1 }}>
                  {user.email}
                </Typography>
                <IconButton
                  size='large'
                  edge='end'
                  color='inherit'
                  onClick={handleMenuOpen}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleLogout}>
                    <Logout sx={{ mr: 1 }} />
                    ログアウト
                  </MenuItem>
                </Menu>
              </Box>
            </Toolbar>
          </AppBar>

          <Container maxWidth='lg' sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={showReview ? 1 : 0} onChange={handleTabChange}>
                <Tab label='単語登録' />
                <Tab label='単語一覧' />
              </Tabs>
            </Box>

            {!showReview ? (
              <WordRegistration onAddWord={handleAddWord} loading={loading} />
            ) : (
              <WordList
                words={words}
                loading={loading}
                onDeleteWord={deleteVocabularyWord}
              />
            )}
          </Container>
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;
