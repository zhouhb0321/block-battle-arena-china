
// 粒子效果系统 - 为消行添加动态效果
export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'spark' | 'debris' | 'glow';
}

export interface ParticleSystem {
  particles: Particle[];
  lastUpdate: number;
}

// 创建消行粒子效果
export const createLineClearEffect = (
  clearedLines: number[],
  boardWidth: number,
  cellSize: number,
  isSpecial: boolean = false
): Particle[] => {
  const particles: Particle[] = [];
  const colors = isSpecial 
    ? ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4', '#45b7d1'] // 特殊消行颜色
    : ['#ffffff', '#f0f0f0', '#e0e0e0', '#d0d0d0']; // 普通消行颜色
  
  clearedLines.forEach((lineIndex) => {
    // 为每一行创建粒子
    for (let col = 0; col < boardWidth; col++) {
      const particleCount = isSpecial ? 8 : 4; // 特殊消行更多粒子
      
      for (let i = 0; i < particleCount; i++) {
        const particle: Particle = {
          id: `${lineIndex}-${col}-${i}`,
          x: col * cellSize + cellSize / 2,
          y: lineIndex * cellSize + cellSize / 2,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 6 - 2,
          life: 1.0,
          maxLife: 1.0,
          size: Math.random() * 4 + 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          type: Math.random() < 0.7 ? 'spark' : (Math.random() < 0.5 ? 'debris' : 'glow')
        };
        particles.push(particle);
      }
    }
  });
  
  return particles;
};

// 创建T-Spin粒子效果
export const createTSpinEffect = (
  centerX: number,
  centerY: number,
  cellSize: number
): Particle[] => {
  const particles: Particle[] = [];
  const colors = ['#ff6b6b', '#ffd93d', '#ff8cc8', '#8b5cf6'];
  
  // 创建爆炸效果
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const speed = Math.random() * 6 + 3;
    
    const particle: Particle = {
      id: `tspin-${i}`,
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      maxLife: 1.0,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'glow'
    };
    particles.push(particle);
  }
  
  return particles;
};

// 创建连击粒子效果
export const createComboEffect = (
  combo: number,
  centerX: number,
  centerY: number
): Particle[] => {
  const particles: Particle[] = [];
  const intensity = Math.min(combo, 10);
  const colors = ['#ffd93d', '#ff6b6b', '#6bcf7f', '#45b7d1'];
  
  for (let i = 0; i < intensity * 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 2;
    
    const particle: Particle = {
      id: `combo-${combo}-${i}`,
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 1.0,
      maxLife: 1.0,
      size: Math.random() * 3 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: 'spark'
    };
    particles.push(particle);
  }
  
  return particles;
};

// 更新粒子系统
export const updateParticles = (
  particles: Particle[],
  deltaTime: number,
  gravity: number = 0.3
): Particle[] => {
  return particles
    .map(particle => {
      // 更新位置
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      
      // 应用重力
      particle.vy += gravity * deltaTime;
      
      // 更新生命周期
      particle.life -= deltaTime / 1000; // 1秒生命周期
      
      // 根据类型应用不同效果
      switch (particle.type) {
        case 'spark':
          particle.vx *= 0.98; // 阻力
          particle.vy *= 0.98;
          break;
        case 'debris':
          particle.vy += gravity * deltaTime * 0.5; // 更多重力
          break;
        case 'glow':
          particle.size *= 0.99; // 逐渐缩小
          break;
      }
      
      return particle;
    })
    .filter(particle => particle.life > 0); // 移除死亡粒子
};

// 渲染粒子
export const renderParticle = (
  ctx: CanvasRenderingContext2D,
  particle: Particle
): void => {
  const alpha = particle.life / particle.maxLife;
  
  ctx.save();
  ctx.globalAlpha = alpha;
  
  switch (particle.type) {
    case 'spark':
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'debris':
      ctx.fillStyle = particle.color;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
      break;
      
    case 'glow':
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size
      );
      gradient.addColorStop(0, particle.color);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  
  ctx.restore();
};

// 粒子系统管理器
export class ParticleManager {
  private particles: Particle[] = [];
  private lastUpdate: number = Date.now();
  
  addParticles(newParticles: Particle[]): void {
    this.particles.push(...newParticles);
  }
  
  update(): void {
    const now = Date.now();
    const deltaTime = now - this.lastUpdate;
    this.particles = updateParticles(this.particles, deltaTime);
    this.lastUpdate = now;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach(particle => {
      renderParticle(ctx, particle);
    });
  }
  
  clear(): void {
    this.particles = [];
  }
  
  getParticleCount(): number {
    return this.particles.length;
  }
}
