// FILE: src/components/ProfileModal.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { UserProfile } from './UserProfile';
import { GameHistory } from './GameHistory';
import { useAuthStore } from '../state/authStore';
import { useTranslation } from '../hooks/useTranslation';
import { User, ClockCounterClockwise } from '@phosphor-icons/react';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ open, onOpenChange }: ProfileModalProps) {
  const { isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');

  if (!isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('profile.userProfile')}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User size={16} />
              {t('profile.profile')}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <ClockCounterClockwise size={16} />
              {t('profile.history')}
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4 overflow-auto max-h-[60vh]">
            <TabsContent value="profile" className="space-y-4">
              <UserProfile />
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <GameHistory />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}