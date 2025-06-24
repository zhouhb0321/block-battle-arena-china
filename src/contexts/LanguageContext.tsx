
import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'zh' | 'en' | 'ja' | 'ko';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  zh: {
    'game.title': '方块竞技场',
    'game.play': '开始游戏',
    'game.singlePlayer': '单人模式',
    'game.multiPlayer': '多人模式',
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
  },
  en: {
    'game.title': 'Block Battle Arena',
    'game.play': 'Play Game',
    'game.singlePlayer': 'Single Player',
    'game.multiPlayer': 'Multiplayer',
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
  },
  ja: {
    'game.title': 'ブロックバトルアリーナ',
    'game.play': 'ゲーム開始',
    'game.singlePlayer': 'シングルプレイ',
    'game.multiPlayer': 'マルチプレイ',
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
  },
  ko: {
    'game.title': '블록 배틀 아레나',
    'game.play': '게임 시작',
    'game.singlePlayer': '싱글 플레이어',
    'game.multiPlayer': '멀티 플레이어',
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
