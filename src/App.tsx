import React, { useEffect } from 'react';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AboutModal } from './components/AboutModal';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { Button } from './components/ui/button';
import { useGameStore } from './state/gameStore';
import { useTranslation } from './hooks/useTranslation';
import { Info } from '@phosphor-icons/react';

function App() {
  const { 
    settings, 
    loadSavedGame, 
    setShowAbout,
    setLanguage 
  } = useGameStore();
  
  const { t } = useTranslation();
  
  useEffect(() => {
    // Set initial document attributes
    document.documentElement.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = settings.language;
    
    // Load saved game on startup
    loadSavedGame();
  }, [settings.language, loadSavedGame]);
  
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
      
      {/* Toast Notifications */}
      <Toast />
    </div>
  );
}

export default App;