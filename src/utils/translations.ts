
export const translations = {
  zh: {
    // 认证相关
    'auth.login': '登录',
    'auth.login_desc': '请输入您的账号信息进行登录',
    'auth.register': '注册',
    'auth.register_desc': '创建新账号开始游戏',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.username': '用户名',
    'auth.confirm_password': '确认密码',
    'auth.login_button': '登录',
    'auth.register_button': '注册',
    'auth.guest_login': '游客登录',
    'auth.forgot_password': '忘记密码？',
    
    // 菜单相关
    'menu.singlePlayer': '单人游戏',
    'menu.singlePlayerDesc': '挑战各种单人游戏模式',
    'menu.multiPlayer': '多人游戏',
    'menu.multiPlayerDesc': '与其他玩家进行对战',
    'menu.settings': '设置',
    'menu.settingsDesc': '调整游戏设置和偏好',
    'menu.profile': '个人资料',
    'menu.profileDesc': '查看和编辑个人信息',
    'menu.leaderboard': '排行榜',
    'menu.leaderboardDesc': '查看全球玩家排名',
    
    // 游戏模式
    'game.sprint40': '40行竞速',
    'game.sprint40_desc': '尽快完成40行消除',
    'game.endurance': '耐力模式',
    'game.endurance_desc': '看看你能坚持多久',
    'game.timeAttack': '限时挑战',
    'game.timeAttack_desc': '在限定时间内获得最高分',
    
    // 通用
    'common.start': '开始',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.save': '保存',
    'common.back': '返回',
    'common.close': '关闭',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功'
  },
  en: {
    // Auth
    'auth.login': 'Login',
    'auth.login_desc': 'Enter your credentials to login',
    'auth.register': 'Register',
    'auth.register_desc': 'Create a new account to start playing',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.confirm_password': 'Confirm Password',
    'auth.login_button': 'Sign In',
    'auth.register_button': 'Sign Up',
    'auth.guest_login': 'Play as Guest',
    'auth.forgot_password': 'Forgot Password?',
    
    // Menu
    'menu.singlePlayer': 'Single Player',
    'menu.singlePlayerDesc': 'Challenge various single player modes',
    'menu.multiPlayer': 'Multi Player',
    'menu.multiPlayerDesc': 'Battle against other players',
    'menu.settings': 'Settings',
    'menu.settingsDesc': 'Adjust game settings and preferences',
    'menu.profile': 'Profile',
    'menu.profileDesc': 'View and edit your profile',
    'menu.leaderboard': 'Leaderboard',
    'menu.leaderboardDesc': 'View global player rankings',
    
    // Game modes
    'game.sprint40': '40 Line Sprint',
    'game.sprint40_desc': 'Clear 40 lines as fast as possible',
    'game.endurance': 'Endurance',
    'game.endurance_desc': 'See how long you can last',
    'game.timeAttack': 'Time Attack',
    'game.timeAttack_desc': 'Get the highest score in limited time',
    
    // Common
    'common.start': 'Start',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.back': 'Back',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success'
  }
};

export const t = (key: string, lang: string = 'zh'): string => {
  const langTranslations = translations[lang as keyof typeof translations] || translations.zh;
  return langTranslations[key as keyof typeof langTranslations] || key;
};
