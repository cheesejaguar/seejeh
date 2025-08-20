import React, { useEffect } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AboutModal } from './components/AboutModal';
import { SettingsModal } from './components/SettingsModal';
import { ProfileModal } from './components/ProfileModal';
import { LoginPrompt } from './components/LoginPrompt';
import { Toast } from './components/Toast';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { useGameStore } from './state/gameStore';
import { useAuthStore } from './state/authStore';
import { useTranslation } from './hooks/useTranslation';
import { Info, User } from '@phosphor-icons/react';

function App() {
  const { 
    settings, 
    loadSavedGame, 
    setShowAbout,
    setShowProfile,
    showProfile,
    setLanguage 
  } = useGameStore();
  
  const { 
    isAuthenticated, 
    user, 
    login, 
    isLoading: authLoading 
  } = useAuthStore();
  
  const { t } = useTranslation();
  
  const [guestMode, setGuestMode] = React.useState(false);
  
  useEffect(() => {
    // Set initial document attributes
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
    
    // Load saved game on startup
    loadSavedGame();
    
    // Check if guest mode is enabled
    const isGuestMode = localStorage.getItem('guestMode') === 'true';
    setGuestMode(isGuestMode);
    
    // Try to authenticate automatically if not in guest mode
    if (!isGuestMode) {
      login();
    }
  }, [settings.language, loadSavedGame, login]);
  
  // Show login prompt if not authenticated and not loading and not in guest mode
  if (!isAuthenticated && !authLoading && !guestMode) {
    return <LoginPrompt />;
  }
  
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('title')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('subtitle')}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAbout(true)}
                variant="outline"
                size="sm"
              >
                <Info size={16} className="mr-2" />
                {t('about')}
              </Button>
              
              {isAuthenticated && user ? (
                <Button
                  onClick={() => setShowProfile(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url} alt={user.login} />
                    <AvatarFallback>{user.login[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user.login}</span>
                </Button>
              ) : guestMode ? (
                <Button
                  onClick={() => {
                    localStorage.removeItem('guestMode');
                    login();
                  }}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <User size={16} />
                  {t('auth.loginButton')}
                </Button>
              ) : null}
              
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        
        {/* Main Game Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2 flex justify-center">
            <div className="w-full max-w-lg">
              <Board />
            </div>
          </div>
          
          {/* Controls */}
          <div className="lg:col-span-1">
            <Controls />
          </div>
        </div>
        
        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          <p>
            Traditional Seejeh with AI Opponents • Made with React & TypeScript
          </p>
        </footer>
      </div>
      
      {/* Modals */}
      <AboutModal />
      <SettingsModal />
      <ProfileModal 
        open={showProfile} 
        onOpenChange={setShowProfile} 
      />
      
      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}

export default App;