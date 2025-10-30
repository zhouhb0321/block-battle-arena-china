import { supabase } from '@/integrations/supabase/client';

const getUserRegion = () => {
  const locale = navigator.language || 'en-US';
  return locale.split('-')[1] || 'US';
};

const getUserLanguage = () => {
  const locale = navigator.language || 'en';
  return locale.split('-')[0];
};

const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  return 'desktop';
};

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('ad_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem('ad_session_id', sessionId);
  }
  return sessionId;
};

export const trackAdImpression = async (adId: string, userId?: string) => {
  const region = getUserRegion();
  const language = getUserLanguage();
  const deviceType = getDeviceType();

  await supabase.from('ad_impressions').insert({
    ad_id: adId,
    user_id: userId,
    region,
    language,
    device_type: deviceType,
    user_agent: navigator.userAgent,
    session_id: getSessionId()
  });

  // Update advertisement impressions count
  const { data } = await supabase
    .from('advertisements')
    .select('impressions')
    .eq('id', adId)
    .single();
  
  if (data) {
    await supabase
      .from('advertisements')
      .update({ impressions: (data.impressions || 0) + 1 })
      .eq('id', adId);
  }
};

export const trackAdClick = async (
  adId: string, 
  clickedUrl: string, 
  userId?: string
) => {
  const region = getUserRegion();
  const language = getUserLanguage();
  const deviceType = getDeviceType();

  await supabase.from('ad_clicks').insert({
    ad_id: adId,
    user_id: userId,
    region,
    language,
    device_type: deviceType,
    clicked_url: clickedUrl
  });

  // Update advertisement clicks count
  await supabase
    .from('advertisements')
    .select('clicks')
    .eq('id', adId)
    .single()
    .then(({ data }) => {
      if (data) {
        supabase
          .from('advertisements')
          .update({ clicks: (data.clicks || 0) + 1 })
          .eq('id', adId);
      }
    });
};

export const getAdAnalytics = async (
  adId: string,
  startDate: Date,
  endDate: Date
) => {
  const { data: impressions } = await supabase
    .from('ad_impressions')
    .select('*')
    .eq('ad_id', adId)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString());

  const { data: clicks } = await supabase
    .from('ad_clicks')
    .select('*')
    .eq('ad_id', adId)
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString());

  return {
    impressions: impressions || [],
    clicks: clicks || [],
    totalImpressions: impressions?.length || 0,
    totalClicks: clicks?.length || 0,
    ctr: impressions?.length ? ((clicks?.length || 0) / impressions.length) * 100 : 0
  };
};

// Check ad frequency for user
export const checkAdFrequency = (adId: string, frequencyCap?: number): boolean => {
  if (!frequencyCap) return true;

  const today = new Date().toDateString();
  const key = `ad_freq_${adId}_${today}`;
  const count = parseInt(localStorage.getItem(key) || '0');

  return count < frequencyCap;
};

// Record ad view for frequency control
export const recordAdView = (adId: string): void => {
  const today = new Date().toDateString();
  const key = `ad_freq_${adId}_${today}`;
  const count = parseInt(localStorage.getItem(key) || '0');
  localStorage.setItem(key, (count + 1).toString());
};

// Clean expired frequency records (call on app init)
export const cleanExpiredFrequencyRecords = (): void => {
  const today = new Date().toDateString();
  const keys = Object.keys(localStorage).filter(k => k.startsWith('ad_freq_'));
  
  keys.forEach(key => {
    const date = key.split('_').pop();
    if (date !== today) {
      localStorage.removeItem(key);
    }
  });
};
