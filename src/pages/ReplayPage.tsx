import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadReplayById } from '@/utils/replayLoader';
import ReplayPlayerV4Unified from '@/components/ReplayPlayerV4Unified';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ReplayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [replay, setReplay] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReplay = async () => {
      if (!id) {
        setError(t('replay.notFound'));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Reset previously loaded replay so a stale one is never shown
        setReplay(null);
        setError(null);
        const replayData = await loadReplayById(id);

        // Integrity guard: ensure the loaded replay matches the requested ID
        const loadedId =
          replayData?.id ||
          replayData?.v4Data?.metadata?.replayId ||
          replayData?.metadata?.replayId;
        if (loadedId && loadedId !== id) {
          console.warn('[ReplayPage] Replay ID mismatch, forcing reload', { requested: id, loaded: loadedId });
          throw new Error(t('replay.loadFailed'));
        }

        setReplay(replayData);
      } catch (err) {
        console.error('Failed to load replay:', err);
        setError(err instanceof Error ? err.message : t('replay.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    loadReplay();
  }, [id, t]);

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('replay.loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              {t('replay.error')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.backToHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!replay) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('replay.notFound')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.backToHome')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const v4Data = replay?.v4Data || replay;

  return (
    <div className="min-h-screen bg-background">
      <ReplayPlayerV4Unified
        key={id || v4Data?.metadata?.replayId || v4Data?.checksum || 'replay'}
        replay={v4Data}
        onClose={handleBack}
        autoPlay={true}
      />
    </div>
  );
};

export default ReplayPage;
