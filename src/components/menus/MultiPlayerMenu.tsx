import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sword, Users, Zap, Target, Coffee, User, Gamepad2, Bot, Trophy, Crown, AlertCircle, Plus, LogIn, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { debugLog } from '@/utils/debugLogger';
import { toast } from 'sonner';
import TeamBattleMenu from './TeamBattleMenu';
import { useBattleRoom } from '@/hooks/useBattleRoom';
import CustomRoomSettings, { CustomRoomConfig } from '@/components/CustomRoomSettings';
import RoomPasswordDialog from '@/components/RoomPasswordDialog';

interface MultiPlayerMenuProps {
  onSelectMode: (mode: string, config?: any) => void;
  onBack: () => void;
}

const MultiPlayerMenu: React.FC<MultiPlayerMenuProps> = ({ onSelectMode, onBack }) => {
  const { user, loginAsGuest } = useAuth();
  const { t } = useLanguage();
  const { createRoom, joinRoom, loading: battleLoading, error: battleError } = useBattleRoom();
  const [activeRooms, setActiveRooms] = useState(0);
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [pendingMode, setPendingMode] = useState<'versus' | 'battle_royale' | 'league' | null>(null);
  const [subView, setSubView] = useState<'menu' | 'team-battle'>('menu');
  
  // Password dialog state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<{ id: string; code: string } | null>(null);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadRoomStats();
  }, []);

  useEffect(() => {
    if (battleError) {
      setError(battleError);
    }
  }, [battleError]);

  const loadRoomStats = async () => {
    try {
      setError(null);
      const { data: rooms, error } = await supabase
        .from('battle_rooms')
        .select('current_players')
        .eq('status', 'waiting');

      if (error) {
        debugLog.error('Error loading room stats', error);
        setError(t('common.loadStatsFailed'));
        return;
      }

      setActiveRooms(rooms?.length || 0);
      setOnlinePlayers(rooms?.reduce((sum, room) => sum + room.current_players, 0) || 0);
    } catch (error) {
      debugLog.error('Exception loading room stats', error);
      setError(t('common.networkError'));
    }
  };

  const handleCreateRoom = async (mode: 'versus' | 'battle_royale' | 'league', customConfig?: CustomRoomConfig) => {
    if (!user) {
      setError(t('room.needLogin'));
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const settings = customConfig ? {
        password: customConfig.room_password,
        allowSpectators: customConfig.allow_spectators,
        customSettings: {
          gravity_level: customConfig.gravity_level,
          garbage_multiplier: customConfig.garbage_multiplier,
          time_limit: customConfig.time_limit,
          allow_hold: customConfig.allow_hold,
          starting_level: customConfig.starting_level,
          preset: customConfig.preset
        }
      } : undefined;

      const room = await createRoom(mode, settings);
      if (room) {
        toast.success(t('room.createSuccess') + room.room_code);
        if (mode === 'league') {
          onSelectMode('team-battle', { roomId: room.id, customConfig });
        } else {
          onSelectMode('battle-lobby', { roomId: room.id, customConfig });
        }
      }
    } catch (error) {
      debugLog.error('Create room failed', error);
      setError(t('room.createFailed'));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoomSettingsConfirm = useCallback(async (config: CustomRoomConfig) => {
    if (pendingMode) {
      await handleCreateRoom(pendingMode, config);
      setShowRoomSettings(false);
      setPendingMode(null);
    }
  }, [pendingMode]);

  const handleModeSelect = async (mode: string) => {
    if (!user) {
      setError(t('multiplayer.needLoginMulti'));
      return;
    }

    if (user.isGuest && (mode === 'ranked' || mode === 'tournament')) {
      toast.error(t('auth.guestRestricted'));
      return;
    }

    if (mode === 'custom-room') {
      setPendingMode('versus');
      setShowRoomSettings(true);
      return;
    }

    if (mode === 'one-vs-one') {
      await handleCreateRoom('versus');
      return;
    }

    if (mode === 'team-battle') {
      setPendingMode('league');
      setShowRoomSettings(true);
      return;
    }

    if (mode === 'ranked') {
      onSelectMode('ranked');
      return;
    }

    if (mode === 'bot-room') {
      onSelectMode('ai-battle');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      await onSelectMode(mode);
    } catch (error) {
      debugLog.error('Mode selection failed', error);
      setError(t('common.modeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await loginAsGuest();
      toast.success(t('auth.guestSuccess'));
    } catch (error) {
      debugLog.error('Guest login failed', error);
      setError(t('auth.guestLoginFailed'));
      toast.error(t('auth.guestLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) {
      setError(t('room.enterCode'));
      return;
    }

    if (!user) {
      await handleGuestLogin();
      setTimeout(() => handleJoinByCode(), 1000);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const { data: roomData, error: queryError } = await supabase
        .from('battle_rooms')
        .select('id, room_code, room_password, status')
        .eq('room_code', roomCode.trim())
        .eq('status', 'waiting')
        .single();

      if (queryError || !roomData) {
        setError(t('room.notExist'));
        setIsJoining(false);
        return;
      }

      if (roomData.room_password) {
        setPendingRoom({ id: roomData.id, code: roomData.room_code });
        setShowPasswordDialog(true);
        setIsJoining(false);
        return;
      }

      const room = await joinRoom(roomCode.trim());
      if (room) {
        toast.success(t('room.joinSuccess'));
        onSelectMode('battle-lobby', { roomId: room.id });
      }
    } catch (error) {
      debugLog.error('Join room failed:', error);
      setError(t('room.joinFailed'));
    } finally {
      setIsJoining(false);
    }
  };

  const handlePasswordConfirm = async (password: string) => {
    if (!pendingRoom) return;

    setPasswordLoading(true);
    setPasswordError(undefined);

    try {
      const room = await joinRoom(pendingRoom.id, password);
      if (room) {
        setShowPasswordDialog(false);
        setPendingRoom(null);
        toast.success(t('room.joinSuccess'));
        onSelectMode('battle-lobby', { roomId: room.id });
      } else {
        setPasswordError(t('room.passwordError'));
      }
    } catch (error: any) {
      setPasswordError(error.message || t('room.passwordError'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordDialogClose = () => {
    setShowPasswordDialog(false);
    setPendingRoom(null);
    setPasswordError(undefined);
  };

  const menuOptions = [
    {
      id: 'one-vs-one',
      title: t('multiplayer.1v1'),
      description: t('multiplayer.1v1Desc'),
      icon: <Sword className="w-8 h-8" />,
      disabled: false,
      guestAllowed: true
    },
    {
      id: 'team-battle',
      title: t('teamBattle.title'),
      description: t('teamBattle.entryDesc'),
      icon: <Users className="w-8 h-8" />,
      disabled: false,
      guestAllowed: false
    },
    {
      id: 'ranked',
      title: t('multiplayer.ranked'),
      description: t('multiplayer.rankedDesc'),
      icon: <Target className="w-8 h-8" />,
      disabled: false,
      guestAllowed: false
    },
    {
      id: 'custom-room',
      title: t('multiplayer.customRoom'),
      description: t('multiplayer.customRoomDesc'),
      icon: <Users className="w-8 h-8" />,
      disabled: false,
      guestAllowed: true
    },
    {
      id: 'battle-royal',
      title: t('multiplayer.battleRoyale'),
      description: t('multiplayer.battleRoyaleDesc'),
      icon: <Zap className="w-8 h-8" />,
      disabled: true,
      comingSoon: true,
      guestAllowed: false
    },
    {
      id: 'bot-room',
      title: t('multiplayer.botRoom'),
      description: t('multiplayer.botRoomDesc'),
      icon: <Coffee className="w-8 h-8" />,
      disabled: false,
      guestAllowed: true
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('multiplayer.title')}</h1>
        <div className="flex gap-4 text-sm text-muted-foreground mb-4">
          <span>🎮 {t('room.activeRooms')}: {activeRooms}</span>
          <span>👥 {t('room.onlinePlayers')}: {onlinePlayers}</span>
          {user && <span>👤 {user.isGuest ? t('common.guestUser') : t('common.registeredUser')}: {user.username}</span>}
        </div>
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive mb-4">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadRoomStats}
              className="ml-auto"
            >
              {t('common.retry')}
            </Button>
          </div>
        )}

        {!user && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
            <p className="text-foreground mb-3">{t('multiplayer.needLoginMulti')}</p>
            <Button 
              onClick={handleGuestLogin} 
              disabled={loading}
              className="bg-primary hover:bg-primary/90"
            >
              {loading ? t('common.loading') : t('multiplayer.quickLogin')}
            </Button>
          </div>
        )}
      </div>

      {/* Quick Join by Room Code */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('room.quickJoin')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t('room.enterRoomCode')}
              value={roomCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setRoomCode(value);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinByCode()}
              className="flex-1"
              maxLength={4}
            />
            <Button 
              onClick={handleJoinByCode}
              disabled={!roomCode.trim() || isJoining}
              className="px-6"
            >
              {isJoining ? t('room.joining') : t('room.join')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {menuOptions.map((option) => {
          const isDisabledForGuest = user?.isGuest && !option.guestAllowed;
          const finalDisabled = option.disabled || !user || isDisabledForGuest || loading;
          
          return (
            <Card 
              key={option.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                finalDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
              }`}
              onClick={() => !finalDisabled && handleModeSelect(option.id)}
            >
              <CardContent className="p-8 text-center space-y-4">
                <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center transition-colors ${
                  option.disabled 
                    ? 'bg-muted text-muted-foreground' 
                    : 'bg-primary/10 text-primary group-hover:bg-primary/20'
                }`}>
                  {option.icon}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">
                    {option.title}
                    {option.comingSoon && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {t('common.comingSoon')}
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                  
                  {!user && !option.guestAllowed && (
                    <div className="text-xs text-amber-600 font-medium bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded">
                      {t('common.needLogin')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button onClick={onBack} variant="outline" disabled={loading}>
          {t('nav.backToMenu')}
        </Button>
      </div>

      {/* Custom Room Settings Dialog */}
      <CustomRoomSettings
        open={showRoomSettings}
        onClose={() => {
          setShowRoomSettings(false);
          setPendingMode(null);
        }}
        onConfirm={handleRoomSettingsConfirm}
        mode={pendingMode || 'versus'}
      />

      {/* Room Password Dialog */}
      <RoomPasswordDialog
        open={showPasswordDialog}
        onClose={handlePasswordDialogClose}
        onConfirm={handlePasswordConfirm}
        roomCode={pendingRoom?.code || ''}
        loading={passwordLoading}
        error={passwordError}
      />
    </div>
  );
};

export default MultiPlayerMenu;
