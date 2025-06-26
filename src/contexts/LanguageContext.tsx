
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'zh' | 'zh-TW' | 'en' | 'ja' | 'ko';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  zh: {
    'game.title': '俄罗斯方块竞技平台',
    'game.play': '开始游戏',
    'game.singlePlayer': '单人模式',
    'game.multiPlayer': '多人模式',
    'game.ranked': '排位赛',
    'game.sprint40': '40行竞速',
    'game.ultra2min': '2分钟极限',
    'game.endless': '无尽模式',
    'game.freeForAll': '自由对战',
    'game.oneVsOne': '1v1对战',
    'game.customRoom': '自建房间',
    'auth.login': '登录',
    'auth.register': '注册',
    'auth.guest': '游客模式',
    'auth.username': '用户名',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'settings.controls': '控制设置',
    'settings.das': '键盘重复速率',
    'settings.arr': '软降速度',
    'settings.sdf': '瞬降速度',
    'room.create': '创建房间',
    'room.join': '加入房间',
    'room.share': '分享房间',
    'room.maxPlayers': '最大玩家数',
    'replay.view': '查看回放',
    'replay.speed': '回放速度',
    'nav.home': '首页',
    'nav.play': '游戏',
    'nav.multiplayer': '多人游戏',
    'nav.profile': '个人资料',
    'nav.leaderboard': '排行榜',
    'nav.settings': '设置',
    'rank.system': '排位系统',
    'rank.current': '当前段位',
    'rank.points': '积分',
    'rank.nextRank': '下一段位',
    'rank.promotion': '还需积分晋级',
    'ad.placeholder': '广告位招租中',
    'ad.contact': '联系管理员',
    'income.donations': '捐赠收入',
    'income.ads': '广告收入',
    'income.total': '总收入',
  },
  'zh-TW': {
    'game.title': '俄羅斯方塊競技平台',
    'game.play': '開始遊戲',
    'game.singlePlayer': '單人模式',
    'game.multiPlayer': '多人模式',
    'game.ranked': '排位賽',
    'game.sprint40': '40行競速',
    'game.ultra2min': '2分鐘極限',
    'game.endless': '無盡模式',
    'game.freeForAll': '自由對戰',
    'game.oneVsOne': '1v1對戰',
    'game.customRoom': '自建房間',
    'auth.login': '登入',
    'auth.register': '註冊',
    'auth.guest': '訪客模式',
    'auth.username': '用戶名',
    'auth.email': '郵箱',
    'auth.password': '密碼',
    'settings.controls': '控制設定',
    'settings.das': '鍵盤重複速率',
    'settings.arr': '軟降速度',
    'settings.sdf': '瞬降速度',
    'room.create': '創建房間',
    'room.join': '加入房間',
    'room.share': '分享房間',
    'room.maxPlayers': '最大玩家數',
    'replay.view': '查看回放',
    'replay.speed': '回放速度',
    'nav.home': '首頁',
    'nav.play': '遊戲',
    'nav.multiplayer': '多人遊戲',
    'nav.profile': '個人資料',
    'nav.leaderboard': '排行榜',
    'nav.settings': '設定',
    'rank.system': '排位系統',
    'rank.current': '當前段位',
    'rank.points': '積分',
    'rank.nextRank': '下一段位',
    'rank.promotion': '還需積分晉級',
    'ad.placeholder': '廣告位招租中',
    'ad.contact': '聯繫管理員',
    'income.donations': '捐贈收入',
    'income.ads': '廣告收入',
    'income.total': '總收入',
  },
  en: {
    'game.title': 'Tetris Gaming Platform',
    'game.play': 'Start Playing',
    'game.singlePlayer': 'Single Player',
    'game.multiPlayer': 'Multiplayer',
    'game.ranked': 'Ranked',
    'game.sprint40': '40 Lines Sprint',
    'game.ultra2min': '2 Minute Ultra',
    'game.endless': 'Endless Mode',
    'game.freeForAll': 'Free For All',
    'game.oneVsOne': '1v1 Battle',
    'game.customRoom': 'Custom Room',
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.guest': 'Guest Mode',
    'auth.username': 'Username',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'settings.controls': 'Controls',
    'settings.das': 'DAS Rate',
    'settings.arr': 'ARR Speed',
    'settings.sdf': 'SDF Speed',
    'room.create': 'Create Room',
    'room.join': 'Join Room',
    'room.share': 'Share Room',
    'room.maxPlayers': 'Max Players',
    'replay.view': 'View Replay',
    'replay.speed': 'Replay Speed',
    'nav.home': 'Home',
    'nav.play': 'Play',
    'nav.multiplayer': 'Multiplayer',
    'nav.profile': 'Profile',
    'nav.leaderboard': 'Leaderboard',
    'nav.settings': 'Settings',
    'rank.system': 'Ranking System',
    'rank.current': 'Current Rank',
    'rank.points': 'Points',
    'rank.nextRank': 'Next Rank',
    'rank.promotion': 'Points needed for promotion',
    'ad.placeholder': 'Advertisement Space Available',
    'ad.contact': 'Contact Admin',
    'income.donations': 'Donation Income',
    'income.ads': 'Ad Revenue',
    'income.total': 'Total Income',
  },
  ja: {
    'game.title': 'テトリスゲーミングプラットフォーム',
    'game.play': 'ゲーム開始',
    'game.singlePlayer': 'シングルプレイ',
    'game.multiPlayer': 'マルチプレイ',
    'game.ranked': 'ランクマッチ',
    'game.sprint40': '40ライン',
    'game.ultra2min': '2分間ウルトラ',
    'game.endless': 'エンドレス',
    'game.freeForAll': 'フリーフォーオール',
    'game.oneVsOne': '1対1バトル',
    'game.customRoom': 'カスタムルーム',
    'auth.login': 'ログイン',
    'auth.register': '登録',
    'auth.guest': 'ゲストモード',
    'auth.username': 'ユーザー名',
    'auth.email': 'メール',
    'auth.password': 'パスワード',
    'settings.controls': 'コントロール',
    'settings.das': 'DAS速度',
    'settings.arr': 'ARR速度',
    'settings.sdf': 'SDF速度',
    'room.create': 'ルーム作成',
    'room.join': 'ルーム参加',
    'room.share': 'ルーム共有',
    'room.maxPlayers': '最大プレイヤー数',
    'replay.view': 'リプレイ表示',
    'replay.speed': 'リプレイ速度',
    'nav.home': 'ホーム',
    'nav.play': 'プレイ',
    'nav.multiplayer': 'マルチプレイ',
    'nav.profile': 'プロフィール',
    'nav.leaderboard': 'リーダーボード',
    'nav.settings': '設定',
    'rank.system': 'ランキングシステム',
    'rank.current': '現在のランク',
    'rank.points': 'ポイント',
    'rank.nextRank': '次のランク',
    'rank.promotion': '昇格に必要なポイント',
    'ad.placeholder': '広告スペース利用可能',
    'ad.contact': '管理者に連絡',
    'income.donations': '寄付収入',
    'income.ads': '広告収入',
    'income.total': '総収入',
  },
  ko: {
    'game.title': '테트리스 게이밍 플랫폼',
    'game.play': '게임 시작',
    'game.singlePlayer': '싱글 플레이어',
    'game.multiPlayer': '멀티 플레이어',
    'game.ranked': '랭크전',
    'game.sprint40': '40라인 스프린트',
    'game.ultra2min': '2분 울트라',
    'game.endless': '무한 모드',
    'game.freeForAll': '자유 대전',
    'game.oneVsOne': '1대1 배틀',
    'game.customRoom': '커스텀 룸',
    'auth.login': '로그인',
    'auth.register': '회원가입',
    'auth.guest': '게스트 모드',
    'auth.username': '사용자명',
    'auth.email': '이메일',
    'auth.password': '비밀번호',
    'settings.controls': '컨트롤',
    'settings.das': 'DAS 속도',
    'settings.arr': 'ARR 속도',
    'settings.sdf': 'SDF 속도',
    'room.create': '룸 생성',
    'room.join': '룸 참가',
    'room.share': '룸 공유',
    'room.maxPlayers': '최대 플레이어',
    'replay.view': '리플레이 보기',
    'replay.speed': '리플레이 속도',
    'nav.home': '홈',
    'nav.play': '플레이',
    'nav.multiplayer': '멀티플레이어',
    'nav.profile': '프로필',
    'nav.leaderboard': '리더보드',
    'nav.settings': '설정',
    'rank.system': '랭킹 시스템',
    'rank.current': '현재 랭크',
    'rank.points': '포인트',
    'rank.nextRank': '다음 랭크',
    'rank.promotion': '승급 필요 포인트',
    'ad.placeholder': '광고 공간 사용 가능',
    'ad.contact': '관리자 연락',
    'income.donations': '기부 수입',
    'income.ads': '광고 수입',
    'income.total': '총 수입',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('zh');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
