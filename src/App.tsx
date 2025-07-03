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
import NotificationSettings from './components/NotificationSettings';

function App(): React.JSX.Element {
  const [currentTab, setCurrentTab] = useState(0);
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
    setCurrentTab(newValue);
  };

  const renderTabContent = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam === 'notifications' || window.location.hash === '#notifications') {
      return <NotificationSettings words={words} />;
    }
    
    switch (currentTab) {
      case 1:
        return (
          <WordList
            words={words}
            loading={loading}
            onDeleteWord={deleteVocabularyWord}
          />
        );
      case 2:
        return <NotificationSettings words={words} />;
      default:
        return <WordRegistration onAddWord={handleAddWord} loading={loading} />;
    }
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
          sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <CircularProgress />
          <Typography variant='h6' sx={{ mt: 2 }}>
            読み込み中...
          </Typography>
        </Box>
      ) : !user ? (
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          minHeight: '100vh' 
        }}>
          <Container maxWidth='md'>
            <Box
              display='flex'
              flexDirection='column'
              alignItems='center'
              justifyContent='center'
              minHeight='100vh'
            >
              <Typography variant='h3' component='h1' gutterBottom sx={{ color: 'white' }}>
                英単語学習アプリ
              </Typography>
              <Auth showAuth={showAuth} onToggleAuth={setShowAuth} />
            </Box>
          </Container>
        </Box>
      ) : (
        <Box sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          minHeight: '100vh' 
        }}>
          <AppBar position='static' sx={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
            <Toolbar>
              <Typography variant='h6' component='div' sx={{ flexGrow: 1, color: 'white' }}>
                英単語学習アプリ
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant='body2' sx={{ mr: 1, color: 'white' }}>
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
            <Box sx={{ borderBottom: 1, borderColor: 'rgba(255,255,255,0.3)', mb: 3 }}>
              <Tabs 
                value={(() => {
                  const urlParams = new URLSearchParams(window.location.search);
                  const tabParam = urlParams.get('tab');
                  if (tabParam === 'notifications' || window.location.hash === '#notifications') return 2;
                  return currentTab;
                })()} 
                onChange={(event, newValue) => {
                  if (newValue === 2) {
                    window.location.hash = '#notifications';
                    setCurrentTab(2);
                  } else {
                    window.location.hash = '';
                    handleTabChange(event, newValue);
                  }
                }}
                sx={{
                  '& .MuiTab-root': {
                    color: 'white',
                    '&.Mui-selected': {
                      color: 'white',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'white',
                  },
                }}
              >
                <Tab label='単語登録' />
                <Tab label='単語一覧' />
                <Tab label='通知設定' />
              </Tabs>
            </Box>

            {renderTabContent()}
          </Container>
        </Box>
      )}
    </ThemeProvider>
  );
}

export default App;
