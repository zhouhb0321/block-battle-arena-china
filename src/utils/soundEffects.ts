/**
 * 游戏音效系统
 * 提供消行、连击、T-Spin 等操作的即时音效反馈
 */

// 音效类型定义
export type SoundEffectType = 
  | 'single' | 'double' | 'triple' | 'tetris'
  | 'tspin' | 'tspin_mini' | 'tspin_single' | 'tspin_double' | 'tspin_triple'
  | 'combo_1' | 'combo_2' | 'combo_3' | 'combo_4' | 'combo_5' | 'combo_max'
  | 'perfect_clear' | 'b2b'
  | 'lock' | 'move' | 'rotate' | 'hold' | 'hard_drop'
  | 'garbage_warning' | 'garbage_receive'
  | 'countdown' | 'game_start' | 'game_over';

// 音效配置
interface SoundConfig {
  frequency?: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  ramp?: boolean;
  frequencies?: number[]; // 多音效果
}

// 音效配置表
const SOUND_CONFIGS: Record<SoundEffectType, SoundConfig> = {
  // 消行音效 - 音调递增
  single: { frequency: 440, duration: 100, type: 'sine', gain: 0.3 },
  double: { frequency: 523, duration: 120, type: 'sine', gain: 0.35 },
  triple: { frequency: 659, duration: 140, type: 'sine', gain: 0.4 },
  tetris: { frequencies: [523, 659, 784, 1047], duration: 200, type: 'square', gain: 0.4 },
  
  // T-Spin 音效 - 独特音色
  tspin: { frequency: 880, duration: 150, type: 'sawtooth', gain: 0.35 },
  tspin_mini: { frequency: 660, duration: 100, type: 'sawtooth', gain: 0.3 },
  tspin_single: { frequencies: [880, 1100], duration: 180, type: 'sawtooth', gain: 0.4 },
  tspin_double: { frequencies: [880, 1100, 1320], duration: 220, type: 'sawtooth', gain: 0.45 },
  tspin_triple: { frequencies: [880, 1100, 1320, 1760], duration: 300, type: 'sawtooth', gain: 0.5 },
  
  // 连击音效 - 音调递增
  combo_1: { frequency: 392, duration: 80, type: 'triangle', gain: 0.25 },
  combo_2: { frequency: 440, duration: 80, type: 'triangle', gain: 0.28 },
  combo_3: { frequency: 494, duration: 80, type: 'triangle', gain: 0.3 },
  combo_4: { frequency: 523, duration: 80, type: 'triangle', gain: 0.33 },
  combo_5: { frequency: 587, duration: 80, type: 'triangle', gain: 0.35 },
  combo_max: { frequencies: [659, 784], duration: 100, type: 'triangle', gain: 0.4 },
  
  // 特殊成就
  perfect_clear: { frequencies: [523, 659, 784, 1047, 1319], duration: 400, type: 'sine', gain: 0.5 },
  b2b: { frequencies: [659, 880], duration: 120, type: 'square', gain: 0.3 },
  
  // 操作音效
  lock: { frequency: 200, duration: 50, type: 'sine', gain: 0.2 },
  move: { frequency: 300, duration: 30, type: 'sine', gain: 0.1 },
  rotate: { frequency: 400, duration: 40, type: 'sine', gain: 0.15 },
  hold: { frequency: 350, duration: 60, type: 'triangle', gain: 0.2 },
  hard_drop: { frequency: 150, duration: 80, type: 'sine', gain: 0.25, ramp: true },
  
  // 垃圾行
  garbage_warning: { frequencies: [200, 150], duration: 200, type: 'sawtooth', gain: 0.35 },
  garbage_receive: { frequency: 100, duration: 150, type: 'sawtooth', gain: 0.3 },
  
  // 游戏状态
  countdown: { frequency: 440, duration: 200, type: 'sine', gain: 0.3 },
  game_start: { frequencies: [523, 659, 784], duration: 300, type: 'sine', gain: 0.4 },
  game_over: { frequencies: [440, 349, 294, 220], duration: 500, type: 'sine', gain: 0.35 },
};

class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;
  
  constructor() {
    // 延迟初始化 AudioContext (需要用户交互)
  }
  
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }
  
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
  
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  
  play(effectType: SoundEffectType) {
    if (!this.enabled || this.volume === 0) return;
    
    try {
      const config = SOUND_CONFIGS[effectType];
      if (!config) return;
      
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      
      // 创建增益节点
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(config.gain * this.volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration / 1000);
      
      if (config.frequencies) {
        // 多音效果
        config.frequencies.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          osc.type = config.type;
          osc.frequency.setValueAtTime(freq, now);
          
          const delayedGain = ctx.createGain();
          delayedGain.gain.setValueAtTime(0, now);
          delayedGain.gain.setValueAtTime(config.gain * this.volume, now + index * 0.03);
          delayedGain.gain.exponentialRampToValueAtTime(0.001, now + config.duration / 1000);
          
          osc.connect(delayedGain);
          delayedGain.connect(ctx.destination);
          
          osc.start(now + index * 0.03);
          osc.stop(now + config.duration / 1000 + 0.1);
        });
      } else if (config.frequency) {
        // 单音效果
        const osc = ctx.createOscillator();
        osc.type = config.type;
        osc.frequency.setValueAtTime(config.frequency, now);
        
        if (config.ramp) {
          osc.frequency.exponentialRampToValueAtTime(config.frequency * 0.5, now + config.duration / 1000);
        }
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + config.duration / 1000 + 0.1);
      }
    } catch (e) {
      console.warn('[SoundEffects] Failed to play sound:', e);
    }
  }
  
  // 便捷方法
  playLineClear(lines: number, isTSpin: boolean = false, isMini: boolean = false) {
    if (isTSpin) {
      if (lines === 0) {
        this.play(isMini ? 'tspin_mini' : 'tspin');
      } else if (lines === 1) {
        this.play('tspin_single');
      } else if (lines === 2) {
        this.play('tspin_double');
      } else {
        this.play('tspin_triple');
      }
    } else {
      if (lines === 1) this.play('single');
      else if (lines === 2) this.play('double');
      else if (lines === 3) this.play('triple');
      else if (lines >= 4) this.play('tetris');
    }
  }
  
  playCombo(comboCount: number) {
    if (comboCount <= 1) this.play('combo_1');
    else if (comboCount === 2) this.play('combo_2');
    else if (comboCount === 3) this.play('combo_3');
    else if (comboCount === 4) this.play('combo_4');
    else if (comboCount === 5) this.play('combo_5');
    else this.play('combo_max');
  }
  
  playB2B() {
    this.play('b2b');
  }
  
  playPerfectClear() {
    this.play('perfect_clear');
  }
}

// 单例导出
export const soundEffects = new SoundEffectsManager();

// 初始化函数（需要在用户交互后调用）
export const initSoundEffects = () => {
  // 触发 AudioContext 初始化
  soundEffects.play('move');
};
