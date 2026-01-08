/**
 * 团队积分系统
 * 用于计算团队对战中的攻击力、积分和胜负判定
 */

export interface TeamMember {
  id: string;
  username: string;
  team: 'A' | 'B';
  alive: boolean;
  score: number;
  lines: number;
  attack: number;
  apm: number;
  pps: number;
}

export interface TeamScore {
  teamId: 'A' | 'B';
  totalLines: number;
  totalAttack: number;
  totalScore: number;
  playersAlive: number;
  ko: number; // 击杀数
  members: TeamMember[];
}

export interface AttackDistribution {
  playerId: string;
  lines: number;
}

export type ScoringMode = 'individual' | 'combined';
export type AttackStrategy = 'focus' | 'random' | 'even';

/**
 * 计算团队总攻击力
 */
export const calculateTeamAttack = (
  teamMembers: TeamMember[],
  scoringMode: ScoringMode
): number => {
  const aliveMembers = teamMembers.filter(m => m.alive);
  
  if (aliveMembers.length === 0) return 0;
  
  if (scoringMode === 'combined') {
    // 团队模式：所有成员攻击力相加
    return aliveMembers.reduce((sum, m) => sum + m.attack, 0);
  }
  
  // 个人模式：取最高攻击力
  return Math.max(...aliveMembers.map(m => m.attack));
};

/**
 * 计算团队总积分
 */
export const calculateTeamScore = (members: TeamMember[]): TeamScore => {
  const aliveMembers = members.filter(m => m.alive);
  
  return {
    teamId: members[0]?.team || 'A',
    totalLines: members.reduce((sum, m) => sum + m.lines, 0),
    totalAttack: members.reduce((sum, m) => sum + m.attack, 0),
    totalScore: members.reduce((sum, m) => sum + m.score, 0),
    playersAlive: aliveMembers.length,
    ko: 0, // 由外部更新
    members
  };
};

/**
 * 判断团队胜负
 */
export const determineTeamWinner = (
  teamA: TeamScore,
  teamB: TeamScore
): 'A' | 'B' | 'draw' => {
  // 先比较存活人数
  if (teamA.playersAlive > teamB.playersAlive) return 'A';
  if (teamB.playersAlive > teamA.playersAlive) return 'B';
  
  // 如果一方全部阵亡，另一方胜利
  if (teamA.playersAlive === 0 && teamB.playersAlive === 0) {
    // 同时阵亡，比较总攻击力
    if (teamA.totalAttack > teamB.totalAttack) return 'A';
    if (teamB.totalAttack > teamA.totalAttack) return 'B';
    return 'draw';
  }
  
  // 都存活时比较击杀数
  if (teamA.ko > teamB.ko) return 'A';
  if (teamB.ko > teamA.ko) return 'B';
  
  // 再比较总攻击力
  if (teamA.totalAttack > teamB.totalAttack) return 'A';
  if (teamB.totalAttack > teamA.totalAttack) return 'B';
  
  return 'draw';
};

/**
 * 团队模式下的攻击分配
 */
export const distributeTeamAttack = (
  attackLines: number,
  sourceTeam: 'A' | 'B',
  strategy: AttackStrategy,
  allMembers: TeamMember[]
): AttackDistribution[] => {
  const targetTeam = sourceTeam === 'A' ? 'B' : 'A';
  const targets = allMembers.filter(p => p.team === targetTeam && p.alive);
  
  if (targets.length === 0) return [];
  
  switch (strategy) {
    case 'focus':
      // 攻击对方 APM 最高的玩家（最大威胁）
      const sortedByApm = [...targets].sort((a, b) => b.apm - a.apm);
      return [{ playerId: sortedByApm[0].id, lines: attackLines }];
      
    case 'random':
      // 随机选择一个目标
      const randomTarget = targets[Math.floor(Math.random() * targets.length)];
      return [{ playerId: randomTarget.id, lines: attackLines }];
      
    case 'even':
      // 平均分配给所有对手
      const linesEach = Math.ceil(attackLines / targets.length);
      return targets.map(t => ({ playerId: t.id, lines: linesEach }));
      
    default:
      return [{ playerId: targets[0].id, lines: attackLines }];
  }
};

/**
 * 获取团队 MVP（攻击力最高的玩家）
 */
export const getTeamMVP = (members: TeamMember[]): TeamMember | null => {
  if (members.length === 0) return null;
  return members.reduce((mvp, member) => 
    member.attack > mvp.attack ? member : mvp
  , members[0]);
};

/**
 * 计算团队平均统计
 */
export const getTeamAverages = (members: TeamMember[]): {
  avgApm: number;
  avgPps: number;
  avgAttack: number;
} => {
  if (members.length === 0) {
    return { avgApm: 0, avgPps: 0, avgAttack: 0 };
  }
  
  const total = members.reduce(
    (acc, m) => ({
      apm: acc.apm + m.apm,
      pps: acc.pps + m.pps,
      attack: acc.attack + m.attack
    }),
    { apm: 0, pps: 0, attack: 0 }
  );
  
  return {
    avgApm: Math.round((total.apm / members.length) * 10) / 10,
    avgPps: Math.round((total.pps / members.length) * 100) / 100,
    avgAttack: Math.round(total.attack / members.length)
  };
};

/**
 * 生成团队对战结果
 */
export interface TeamBattleResult {
  winner: 'A' | 'B' | 'draw';
  teamA: TeamScore;
  teamB: TeamScore;
  mvp: TeamMember | null;
  duration: number;
}

export const generateTeamBattleResult = (
  teamAMembers: TeamMember[],
  teamBMembers: TeamMember[],
  duration: number
): TeamBattleResult => {
  const teamA = calculateTeamScore(teamAMembers);
  const teamB = calculateTeamScore(teamBMembers);
  const winner = determineTeamWinner(teamA, teamB);
  
  // MVP 从获胜队伍中选出
  const winningTeamMembers = winner === 'A' ? teamAMembers : 
                             winner === 'B' ? teamBMembers : 
                             [...teamAMembers, ...teamBMembers];
  const mvp = getTeamMVP(winningTeamMembers);
  
  return {
    winner,
    teamA,
    teamB,
    mvp,
    duration
  };
};
