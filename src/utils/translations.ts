// Translation types
type GameTranslations = {
  title: string;
  newGame: string;
  pause: string;
  resume: string;
  gameOver: string;
  score: string;
  level: string;
  lines: string;
  next: string;
  hold: string;
  start: string;
  restart: string;
  backToMenu: string;
  youWin: string;
  tryAgain: string;
  finalScore: string;
  wellDone: string;
  congratulations: string;
  enterYourName: string;
  submitScore: string;
  highScores: string;
  name: string;
  date: string;
  loading: string;
  noScores: string;
  controls: string;
  moveLeft: string;
  moveRight: string;
  softDrop: string;
  hardDrop: string;
  rotateClockwise: string;
  rotateCounterclockwise: string;
  rotate180: string;
  holdPiece: string;
  pauseGame: string;
  backToMainMenu: string;
  music: string;
  soundEffects: string;
  ghostPiece: string;
  blockSkins: string;
  background: string;
  volume: string;
  masterVolume: string;
  musicVolume: string;
  soundEffectsVolume: string;
  gameSettings: string;
  audioSettings: string;
  visualSettings: string;
  gameplaySettings: string;
  generalSettings: string;
  language: string;
  theme: string;
  arr: string;
  das: string;
  sdf: string;
  dcd: string;
  ghostOpacity: string;
  enableWallpaper: string;
  undoSteps: string;
};

type NavTranslations = {
  play: string;
  multiplayer: string;
  settings: string;
  login: string;
  profile: string;
  admin: string;
  logout: string;
  register: string;
  home: string;
  game: string;
  ranked: string;
  replays: string;
  leaderboard: string;
};

type AuthTranslations = {
  login: string;
  register: string;
  logout: string;
  email: string;
  password: string;
  username: string;
  loginSuccess: string;
  registerSuccess: string;
  logoutSuccess: string;
  loginFailed: string;
  registerFailed: string;
  logoutFailed: string;
  guestLogin: string;
  guestLoginSuccess: string;
  guestLoginFailed: string;
  forgotPassword: string;
  resetPassword: string;
  resetPasswordSuccess: string;
  resetPasswordFailed: string;
  confirmPassword: string;
  passwordsDoNotMatch: string;
  saveReplayBeforeLogout: string;
  replaySaveFailed: string;
};

type LanguageTranslations = {
  game: GameTranslations;
  nav: NavTranslations;
  auth: AuthTranslations;
  premium: string;
  subscribe: string;
  admin: string;
  adminPanel: string;
  adminAccess: string;
  level: string;
  userProfile: string;
  leaderboard: string;
  signOut: string;
  saveReplayBeforeLogout: string;
  replaySaveFailed: string;
  accessDenied: string;
  adminAccessRequired: string;
  loadingAdminPanel: string;
  totalUsers: string;
  activeUsers: string;
  totalGames: string;
  completedGames: string;
  systemStatus: string;
  normal: string;
  allServicesRunning: string;
  userManagement: string;
  systemLogs: string;
  gameRecords: string;
  revenueManagement: string;
  adManagement: string;
  userList: string;
  games: string;
  winRate: string;
  gameRecordManagement: string;
  gameRecordFeatureInDevelopment: string;
  revenueManagementFeatureInDevelopment: string;
  adManagementFeatureInDevelopment: string;
};

type Translations = {
  [key in 'en' | 'zh' | 'ja']: LanguageTranslations;
};

export const translations: Translations = {
  en: {
    game: {
      title: 'Tetris Game',
      newGame: 'New Game',
      pause: 'Pause',
      resume: 'Resume',
      gameOver: 'Game Over',
      score: 'Score',
      level: 'Level',
      lines: 'Lines',
      next: 'Next',
      hold: 'Hold',
      start: 'Start',
      restart: 'Restart',
      backToMenu: 'Back to Menu',
      youWin: 'You Win!',
      tryAgain: 'Try Again?',
      finalScore: 'Final Score',
      wellDone: 'Well Done!',
      congratulations: 'Congratulations!',
      enterYourName: 'Enter Your Name',
      submitScore: 'Submit Score',
      highScores: 'High Scores',
      name: 'Name',
      date: 'Date',
      loading: 'Loading...',
      noScores: 'No scores yet.',
      controls: 'Controls',
      moveLeft: 'Move Left',
      moveRight: 'Move Right',
      softDrop: 'Soft Drop',
      hardDrop: 'Hard Drop',
      rotateClockwise: 'Rotate Clockwise',
      rotateCounterclockwise: 'Rotate Counterclockwise',
      rotate180: 'Rotate 180',
      holdPiece: 'Hold Piece',
      pauseGame: 'Pause Game',
      backToMainMenu: 'Back to Main Menu',
      music: 'Music',
      soundEffects: 'Sound Effects',
      ghostPiece: 'Ghost Piece',
      blockSkins: 'Block Skins',
      background: 'Background',
      volume: 'Volume',
      masterVolume: 'Master Volume',
      musicVolume: 'Music Volume',
      soundEffectsVolume: 'Sound Effects Volume',
      gameSettings: 'Game Settings',
      audioSettings: 'Audio Settings',
      visualSettings: 'Visual Settings',
      gameplaySettings: 'Gameplay Settings',
      generalSettings: 'General Settings',
      language: 'Language',
      theme: 'Theme',
      arr: 'ARR',
      das: 'DAS',
      sdf: 'SDF',
      dcd: 'DCD',
      ghostOpacity: 'Ghost Opacity',
      enableWallpaper: 'Enable Wallpaper',
      undoSteps: 'Undo Steps',
    },
    nav: {
      play: 'Play',
      multiplayer: 'Multiplayer',
      settings: 'Settings',
      login: 'Login',
      profile: 'Profile',
      admin: 'Admin',
      logout: 'Logout',
      register: 'Register',
      home: 'Home',
      game: 'Game',
      ranked: 'Ranked',
      replays: 'Replays',
      leaderboard: 'Leaderboard',
    },
    auth: {
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      username: 'Username',
      loginSuccess: 'Login successful!',
      registerSuccess: 'Registration successful!',
      logoutSuccess: 'Logout successful!',
      loginFailed: 'Login failed!',
      registerFailed: 'Registration failed!',
      logoutFailed: 'Logout failed!',
      guestLogin: 'Guest Login',
      guestLoginSuccess: 'Guest login successful!',
      guestLoginFailed: 'Guest login failed!',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      resetPasswordSuccess: 'Password reset email sent!',
      resetPasswordFailed: 'Password reset failed!',
      confirmPassword: 'Confirm Password',
      passwordsDoNotMatch: 'Passwords do not match',
      saveReplayBeforeLogout: 'Game in progress. Save replay before logging out?\n\nClick "OK" to save, "Cancel" to quit without saving.',
      replaySaveFailed: 'Failed to save replay. Do you still want to log out?',
    },
    premium: 'Premium',
    subscribe: 'Subscribe',
    admin: 'Admin',
    adminPanel: 'Admin Panel',
    adminAccess: 'Admin Access',
    level: 'Level',
    userProfile: 'User Profile',
    leaderboard: 'Leaderboard',
    signOut: 'Sign Out',
    saveReplayBeforeLogout: 'Game in progress. Save replay before logging out?\n\nClick "OK" to save, "Cancel" to quit without saving.',
    replaySaveFailed: 'Failed to save replay. Do you still want to log out?',
    accessDenied: 'Access Denied',
    adminAccessRequired: 'Administrator access required',
    loadingAdminPanel: 'Loading Admin Panel...',
    totalUsers: 'Total Users',
    activeUsers: 'Active Users',
    totalGames: 'Total Games',
    completedGames: 'Completed Games',
    systemStatus: 'System Status',
    normal: 'Normal',
    allServicesRunning: 'All services running',
    userManagement: 'User Management',
    systemLogs: 'System Logs',
    gameRecords: 'Game Records',
    revenueManagement: 'Revenue Management',
    adManagement: 'Ad Management',
    userList: 'User List',
    games: 'Games',
    winRate: 'Win Rate',
    gameRecordManagement: 'Game Record Management',
    gameRecordFeatureInDevelopment: 'Game record management feature is in development',
    revenueManagementFeatureInDevelopment: 'Revenue management feature is in development',
    adManagementFeatureInDevelopment: 'Ad management feature is in development',
  },
  zh: {
    game: {
      title: '俄罗斯方块游戏',
      newGame: '开始游戏',
      pause: '暂停',
      resume: '继续',
      gameOver: '游戏结束',
      score: '得分',
      level: '等级',
      lines: '行数',
      next: '下一个',
      hold: '保留',
      start: '开始',
      restart: '重新开始',
      backToMenu: '返回菜单',
      youWin: '你赢了！',
      tryAgain: '再试一次？',
      finalScore: '最终得分',
      wellDone: '做得好！',
      congratulations: '恭喜！',
      enterYourName: '输入你的名字',
      submitScore: '提交分数',
      highScores: '高分榜',
      name: '名字',
      date: '日期',
      loading: '加载中...',
      noScores: '还没有分数。',
      controls: '控制',
      moveLeft: '向左移动',
      moveRight: '向右移动',
      softDrop: '软降',
      hardDrop: '硬降',
      rotateClockwise: '顺时针旋转',
      rotateCounterclockwise: '逆时针旋转',
      rotate180: '180度旋转',
      holdPiece: '保留方块',
      pauseGame: '暂停游戏',
      backToMainMenu: '返回主菜单',
      music: '音乐',
      soundEffects: '音效',
      ghostPiece: '影子方块',
      blockSkins: '方块皮肤',
      background: '背景',
      volume: '音量',
      masterVolume: '主音量',
      musicVolume: '音乐音量',
      soundEffectsVolume: '音效音量',
      gameSettings: '游戏设置',
      audioSettings: '音频设置',
      visualSettings: '视觉设置',
      gameplaySettings: '游戏玩法设置',
      generalSettings: '通用设置',
      language: '语言',
      theme: '主题',
      arr: 'ARR',
      das: 'DAS',
      sdf: 'SDF',
      dcd: 'DCD',
      ghostOpacity: '影子透明度',
      enableWallpaper: '启用壁纸',
      undoSteps: '撤销步数',
    },
    nav: {
      play: '开始',
      multiplayer: '多人游戏',
      settings: '设置',
      login: '登录',
      profile: '个人资料',
      admin: '管理',
      logout: '登出',
      register: '注册',
      home: '主页',
      game: '游戏',
      ranked: '排位',
      replays: '回放',
      leaderboard: '排行榜',
    },
    auth: {
      login: '登录',
      register: '注册',
      logout: '登出',
      email: '邮箱',
      password: '密码',
      username: '用户名',
      loginSuccess: '登录成功！',
      registerSuccess: '注册成功！',
      logoutSuccess: '登出成功！',
      loginFailed: '登录失败！',
      registerFailed: '注册失败！',
      logoutFailed: '登出失败！',
      guestLogin: '游客登录',
      guestLoginSuccess: '游客登录成功！',
      guestLoginFailed: '游客登录失败！',
      forgotPassword: '忘记密码？',
      resetPassword: '重置密码',
      resetPasswordSuccess: '密码重置邮件已发送！',
      resetPasswordFailed: '密码重置失败！',
      confirmPassword: '确认密码',
      passwordsDoNotMatch: '密码不匹配',
      saveReplayBeforeLogout: '游戏进行中，是否保存录像后退出？\n\n选择"确定"保存录像，选择"取消"直接退出（不保存录像）',
      replaySaveFailed: '录像保存失败，是否仍要退出？',
    },
    premium: '高级版',
    subscribe: '订阅',
    admin: '管理员',
    adminPanel: '管理面板',
    adminAccess: '管理员访问',
    level: '等级',
    userProfile: '用户资料',
    leaderboard: '排行榜',
    signOut: '登出',
    saveReplayBeforeLogout: '游戏进行中，是否保存录像后退出？\n\n选择"确定"保存录像，选择"取消"直接退出（不保存录像）',
    replaySaveFailed: '录像保存失败，是否仍要退出？',
    accessDenied: '访问被拒绝',
    adminAccessRequired: '需要管理员权限',
    loadingAdminPanel: '加载管理面板中...',
    totalUsers: '总用户数',
    activeUsers: '活跃用户',
    totalGames: '总游戏数',
    completedGames: '完成的游戏',
    systemStatus: '系统状态',
    normal: '正常',
    allServicesRunning: '所有服务正常运行',
    userManagement: '用户管理',
    systemLogs: '系统日志',
    gameRecords: '游戏记录',
    revenueManagement: '收入管理',
    adManagement: '广告管理',
    userList: '用户列表',
    games: '游戏',
    winRate: '胜率',
    gameRecordManagement: '游戏记录管理',
    gameRecordFeatureInDevelopment: '游戏记录管理功能开发中',
    revenueManagementFeatureInDevelopment: '收入管理功能开发中',
    adManagementFeatureInDevelopment: '广告管理功能开发中',
  },
  ja: {
    game: {
      title: 'テトリスゲーム',
      newGame: '新しいゲーム',
      pause: '一時停止',
      resume: '再開',
      gameOver: 'ゲームオーバー',
      score: 'スコア',
      level: 'レベル',
      lines: 'ライン',
      next: '次',
      hold: 'ホールド',
      start: 'スタート',
      restart: '再スタート',
      backToMenu: 'メニューに戻る',
      youWin: 'おめでとう！',
      tryAgain: 'もう一度試しますか？',
      finalScore: '最終スコア',
      wellDone: 'よくできました！',
      congratulations: 'おめでとうございます！',
      enterYourName: '名前を入力してください',
      submitScore: 'スコアを送信',
      highScores: 'ハイスコア',
      name: '名前',
      date: '日付',
      loading: '読み込み中...',
      noScores: 'スコアはまだありません。',
      controls: 'コントロール',
      moveLeft: '左に移動',
      moveRight: '右に移動',
      softDrop: 'ソフトドロップ',
      hardDrop: 'ハードドロップ',
      rotateClockwise: '時計回りに回転',
      rotateCounterclockwise: '反時計回りに回転',
      rotate180: '180度回転',
      holdPiece: 'ホールドピース',
      pauseGame: 'ゲームを一時停止',
      backToMainMenu: 'メインメニューに戻る',
      music: '音楽',
      soundEffects: '効果音',
      ghostPiece: 'ゴーストピース',
      blockSkins: 'ブロックスキン',
      background: '背景',
      volume: 'ボリューム',
      masterVolume: 'マスターボリューム',
      musicVolume: '音楽ボリューム',
      soundEffectsVolume: '効果音ボリューム',
      gameSettings: 'ゲーム設定',
      audioSettings: 'オーディオ設定',
      visualSettings: 'ビジュアル設定',
      gameplaySettings: 'ゲームプレイ設定',
      generalSettings: '一般設定',
      language: '言語',
      theme: 'テーマ',
      arr: 'ARR',
      das: 'DAS',
      sdf: 'SDF',
      dcd: 'DCD',
      ghostOpacity: 'ゴーストの不透明度',
      enableWallpaper: '壁紙を有効にする',
      undoSteps: 'アンドゥステップ',
    },
    nav: {
      play: 'プレイ',
      multiplayer: 'マルチプレイヤー',
      settings: '設定',
      login: 'ログイン',
      profile: 'プロフィール',
      admin: '管理',
      logout: 'ログアウト',
      register: '登録',
      home: 'ホーム',
      game: 'ゲーム',
      ranked: 'ランク',
      replays: 'リプレイ',
      leaderboard: 'リーダーボード',
    },
    auth: {
      login: 'ログイン',
      register: '登録',
      logout: 'ログアウト',
      email: 'メール',
      password: 'パスワード',
      username: 'ユーザー名',
      loginSuccess: 'ログインに成功しました！',
      registerSuccess: '登録に成功しました！',
      logoutSuccess: 'ログアウトに成功しました！',
      loginFailed: 'ログインに失敗しました！',
      registerFailed: '登録に失敗しました！',
      logoutFailed: 'ログアウトに失敗しました！',
      guestLogin: 'ゲストログイン',
      guestLoginSuccess: 'ゲストログインに成功しました！',
      guestLoginFailed: 'ゲストログインに失敗しました！',
      forgotPassword: 'パスワードをお忘れですか？',
      resetPassword: 'パスワードをリセット',
      resetPasswordSuccess: 'パスワードリセットメールを送信しました！',
      resetPasswordFailed: 'パスワードリセットに失敗しました！',
      confirmPassword: 'パスワードを確認',
      passwordsDoNotMatch: 'パスワードが一致しません',
      saveReplayBeforeLogout: 'ゲーム進行中です。ログアウト前にリプレイを保存しますか？\n\n「OK」で保存、「キャンセル」で保存せずに終了します。',
      replaySaveFailed: 'リプレイの保存に失敗しました。それでもログアウトしますか？',
    },
    premium: 'プレミアム',
    subscribe: '申し込む',
    admin: '管理者',
    adminPanel: '管理パネル',
    adminAccess: '管理者アクセス',
    level: 'レベル',
    userProfile: 'ユーザープロファイル',
    leaderboard: 'リーダーボード',
    signOut: 'サインアウト',
    saveReplayBeforeLogout: 'ゲーム進行中です。ログアウト前にリプレイを保存しますか？\n\n「OK」で保存、「キャンセル」で保存せずに終了します。',
    replaySaveFailed: 'リプレイの保存に失敗しました。それでもログアウトしますか？',
    accessDenied: 'アクセスが拒否されました',
    adminAccessRequired: '管理者アクセスが必要です',
    loadingAdminPanel: '管理パネルをロード中...',
    totalUsers: '総ユーザー数',
    activeUsers: 'アクティブユーザー',
    totalGames: '総ゲーム数',
    completedGames: '完了したゲーム',
    systemStatus: 'システムステータス',
    normal: '正常',
    allServicesRunning: 'すべてのサービスが実行されています',
    userManagement: 'ユーザー管理',
    systemLogs: 'システムログ',
    gameRecords: 'ゲーム記録',
    revenueManagement: '収益管理',
    adManagement: '広告管理',
    userList: 'ユーザーリスト',
    games: 'ゲーム',
    winRate: '勝率',
    gameRecordManagement: 'ゲーム記録管理',
    gameRecordFeatureInDevelopment: 'ゲーム記録管理機能は開発中です',
    revenueManagementFeatureInDevelopment: '収益管理機能は開発中です',
    adManagementFeatureInDevelopment: '広告管理機能は開発中です',
  },
};
