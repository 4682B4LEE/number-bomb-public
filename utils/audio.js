/**
 * ============================================================================
 * 双人猜数对决 - 音频管理工具模块
 * ============================================================================
 *
 * 【文件说明】
 * 本模块使用 Web Audio API 生成游戏音效，无需外部音频文件
 * 支持背景音乐、按钮音效、震动反馈等功能
 *
 * 【功能特性】
 * 1. BGM 背景音乐 - 使用 Web Audio API 实时合成音乐
 * 2. 按钮音效 - 拨号音、木鱼音、确认音、删除音、胜利音
 * 3. 震动反馈 - 支持轻、中、重三种震动强度
 * 4. 本地存储 - 用户设置自动保存到本地
 *
 * 【使用方法】
 * const audio = require('../../utils/audio.js')
 * audio.initAudio()        // 初始化音频
 * audio.toggleBGM()        // 切换背景音乐
 * audio.keyTap()           // 播放按键音
 * audio.victoryTap()       // 播放胜利音效
 * ============================================================================
 */

// 音频上下文（Web Audio API）
let audioContext = null

// 背景音乐状态
let isBgmPlaying = false
let isBgmEnabled = false  // BGM 默认关闭
let isAudioInited = false

// 震动反馈状态
let isVibrationEnabled = false  // 震动默认关闭

// 按钮音效状态
let isSoundEffectEnabled = false  // 按钮音效默认关闭

// ==================== BGM 设置管理 ====================

/**
 * 从本地存储读取 BGM 设置
 * 如果没有设置过，默认关闭
 */
function loadBGMSetting() {
  try {
    const savedSetting = wx.getStorageSync('bgmEnabled')
    // 如果用户设置过，使用用户设置；否则默认关闭
    if (savedSetting !== undefined && savedSetting !== '') {
      isBgmEnabled = savedSetting
    } else {
      isBgmEnabled = false  // 默认关闭
    }
  } catch (e) {
    console.error('读取 BGM 设置失败:', e)
    isBgmEnabled = false  // 默认关闭
  }
}

/**
 * 保存 BGM 设置到本地存储
 * @param {boolean} enabled - 是否启用 BGM
 */
function saveBGMSetting(enabled) {
  try {
    wx.setStorageSync('bgmEnabled', enabled)
  } catch (e) {
    console.error('保存 BGM 设置失败:', e)
  }
}

// ==================== 震动设置管理 ====================

/**
 * 从本地存储读取震动设置
 */
function loadVibrationSetting() {
  try {
    const savedSetting = wx.getStorageSync('vibrationEnabled')
    // 如果用户设置过，使用用户设置；否则默认关闭
    if (savedSetting !== undefined && savedSetting !== '') {
      isVibrationEnabled = savedSetting
    } else {
      isVibrationEnabled = false  // 默认关闭
    }
  } catch (e) {
    console.error('读取震动设置失败:', e)
    isVibrationEnabled = false  // 默认关闭
  }
}

/**
 * 保存震动设置到本地存储
 * @param {boolean} enabled - 是否启用震动
 */
function saveVibrationSetting(enabled) {
  try {
    wx.setStorageSync('vibrationEnabled', enabled)
    isVibrationEnabled = enabled
  } catch (e) {
    console.error('保存震动设置失败:', e)
  }
}

/**
 * 获取震动设置状态
 * @returns {boolean} 震动是否启用
 */
function getVibrationEnabled() {
  return isVibrationEnabled
}

/**
 * 切换震动设置
 * @returns {boolean} 切换后的状态
 */
function toggleVibration() {
  const newValue = !isVibrationEnabled
  saveVibrationSetting(newValue)
  return newValue
}

// ==================== 按钮音效设置管理 ====================

/**
 * 从本地存储读取按钮音效设置
 */
function loadSoundEffectSetting() {
  try {
    const savedSetting = wx.getStorageSync('soundEffectEnabled')
    // 如果用户设置过，使用用户设置；否则默认关闭
    if (savedSetting !== undefined && savedSetting !== '') {
      isSoundEffectEnabled = savedSetting
    } else {
      isSoundEffectEnabled = false  // 默认关闭
    }
  } catch (e) {
    console.error('读取按钮音效设置失败:', e)
    isSoundEffectEnabled = false  // 默认关闭
  }
}

/**
 * 保存按钮音效设置到本地存储
 * @param {boolean} enabled - 是否启用按钮音效
 */
function saveSoundEffectSetting(enabled) {
  try {
    wx.setStorageSync('soundEffectEnabled', enabled)
    isSoundEffectEnabled = enabled
  } catch (e) {
    console.error('保存按钮音效设置失败:', e)
  }
}

/**
 * 获取按钮音效设置状态
 * @returns {boolean} 按钮音效是否启用
 */
function getSoundEffectEnabled() {
  return isSoundEffectEnabled
}

/**
 * 切换按钮音效设置
 * @returns {boolean} 切换后的状态
 */
function toggleSoundEffect() {
  const newValue = !isSoundEffectEnabled
  saveSoundEffectSetting(newValue)
  return newValue
}

// BGM 实例
let bgmInstance = null

/**
 * 初始化音频系统
 * 加载所有设置并初始化 Web Audio Context
 */
function initAudio() {
  if (isAudioInited) return

  // 加载 BGM 设置
  loadBGMSetting()

  // 加载震动设置
  loadVibrationSetting()

  // 加载按钮音效设置
  loadSoundEffectSetting()

  // 初始化 Web Audio Context
  try {
    audioContext = wx.createWebAudioContext()
    isAudioInited = true
    console.log('Web Audio API 初始化完成')
  } catch (e) {
    console.error('Web Audio API 初始化失败:', e)
  }
}

/**
 * 获取音频上下文
 * @returns {AudioContext} Web Audio 上下文
 */
function getAudioContext() {
  if (!audioContext) {
    initAudio()
  }
  return audioContext
}

// ==================== BGM 类定义 ====================

/**
 * Sunny Walk BGM 类
 * 风格：欢快、通关、日常
 * 使用 Web Audio API 实时合成音乐，无需外部音频文件
 */
class SunnyWalkBGM {
  constructor() {
    this.audioCtx = null
    this.masterGain = null
    this.isPlaying = false
    this.schedulerTimer = null
    this.activeNodes = []
    this.noteTime = 0

    // 乐谱配置
    this.bpm = 120                    // 每分钟节拍数
    this.melodyType = 'triangle'      // 旋律音色
    this.bassType = 'sine'            // 低音音色

    // 音符频率表（C3 到 C5）
    this.Notes = {
      'C3': 130.81, 'G3': 196.00,
      'C4': 261.63, 'E4': 329.63, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25
    }

    // 旋律序列
    this.melodySequence = [
      { note: 'C4', len: 0.25 }, { note: 'E4', len: 0.25 }, { note: 'G4', len: 0.25 }, { note: 'A4', len: 0.25 },
      { note: 'G4', len: 0.5 },  { note: 'E4', len: 0.5 },
      { note: 'C4', len: 0.25 }, { note: 'E4', len: 0.25 }, { note: 'G4', len: 0.25 }, { note: 'B4', len: 0.25 },
      { note: 'C5', len: 0.5 },  { note: null, len: 0.5 },
    ]

    // 低音序列
    this.bassSequence = ['C3', 'G3', 'C3', 'G3']
  }

  /**
   * 初始化音频上下文和主音量节点
   * @returns {boolean} 初始化是否成功
   */
  initAudio() {
    if (!this.audioCtx) {
      this.audioCtx = getAudioContext()
      if (!this.audioCtx) return false

      this.masterGain = this.audioCtx.createGain()
      this.masterGain.gain.value = 0.5 // 默认音量 50%
      this.masterGain.connect(this.audioCtx.destination)
    }
    return true
  }

  /**
   * 播放单个音符
   * @param {number} freq - 频率
   * @param {number} duration - 持续时间
   * @param {string} type - 振荡器类型
   * @param {number} startTime - 开始时间
   * @param {boolean} isBass - 是否为低音
   */
  playTone(freq, duration, type, startTime, isBass = false) {
    if (!freq || !this.audioCtx) return

    const osc = this.audioCtx.createOscillator()
    const gainNode = this.audioCtx.createGain()

    osc.type = type
    osc.frequency.value = freq

    // 包络控制 (ADSR 简化版)
    const volume = isBass ? 0.3 : 0.4
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.05) // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05) // Decay

    osc.connect(gainNode)
    gainNode.connect(this.masterGain)

    osc.start(startTime)
    osc.stop(startTime + duration)

    this.activeNodes.push(osc)

    // 清理节点
    osc.onended = () => {
      const index = this.activeNodes.indexOf(osc)
      if (index > -1) this.activeNodes.splice(index, 1)
    }
  }

  /**
   * 开始播放背景音乐
   * 使用调度器实现循环播放
   */
  play() {
    if (this.isPlaying) return
    if (!this.initAudio()) return

    this.isPlaying = true
    this.activeNodes = []

    let noteIndex = 0
    let bassIndex = 0
    this.noteTime = this.audioCtx.currentTime + 0.1

    const scheduleAheadTime = 0.1
    const lookahead = 25.0 // ms

    const scheduler = () => {
      if (!this.isPlaying) return

      // 预调度音频
      while (this.noteTime < this.audioCtx.currentTime + scheduleAheadTime) {
        // 1. 调度旋律
        const noteData = this.melodySequence[noteIndex % this.melodySequence.length]
        const freq = this.Notes[noteData.note]

        // 计算时长: 1 beat = 60 / BPM
        const beatDur = 60 / this.bpm
        const duration = noteData.len * beatDur * 4

        if (freq) {
          this.playTone(freq, duration, this.melodyType, this.noteTime, false)
        }

        // 2. 调度低音 (每4个旋律音符对应1个低音)
        if (noteIndex % 4 === 0) {
          const bassNote = this.bassSequence[bassIndex % this.bassSequence.length]
          this.playTone(this.Notes[bassNote], beatDur * 2, this.bassType, this.noteTime, true)
          bassIndex++
        }

        this.noteTime += duration
        noteIndex++
      }

      this.schedulerTimer = setTimeout(scheduler, lookahead)
    }

    scheduler()
  }

  /**
   * 停止播放背景音乐
   */
  stop() {
    this.isPlaying = false
    if (this.schedulerTimer) clearTimeout(this.schedulerTimer)

    // 立即停止所有正在发声的振荡器
    this.activeNodes.forEach(node => {
      try { node.stop() } catch(e){}
    })
    this.activeNodes = []
  }

  /**
   * 设置主音量
   * @param {number} value - 音量值 (0.0 到 1.0)
   */
  setVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = value
    }
  }
}

// ==================== BGM 控制函数 ====================

/**
 * 初始化背景音乐实例
 */
function initBGM() {
  if (!bgmInstance) {
    bgmInstance = new SunnyWalkBGM()
  }
}

/**
 * 播放背景音乐
 * 如果 BGM 未启用则不会播放
 */
function playBGM() {
  if (!isBgmEnabled) return
  initBGM()
  if (bgmInstance) {
    bgmInstance.play()
    isBgmPlaying = true
  }
}

/**
 * 暂停背景音乐
 */
function pauseBGM() {
  if (bgmInstance) {
    bgmInstance.stop()
  }
  isBgmPlaying = false
}

/**
 * 停止背景音乐
 */
function stopBGM() {
  if (bgmInstance) {
    bgmInstance.stop()
  }
  isBgmPlaying = false
}

/**
 * 切换背景音乐开关
 * @returns {boolean} 切换后的状态
 */
function toggleBGM() {
  isBgmEnabled = !isBgmEnabled

  // 保存设置到本地存储
  saveBGMSetting(isBgmEnabled)

  if (isBgmEnabled) {
    playBGM()
  } else {
    stopBGM()
  }

  return isBgmEnabled
}

/**
 * 获取背景音乐状态
 * @returns {Object} 包含 enabled 和 playing 状态的对象
 */
function getBGMStatus() {
  return {
    enabled: isBgmEnabled,
    playing: isBgmPlaying
  }
}

// ==================== 音效函数 ====================

/**
 * 拨号音 (Dial/DTMF) - 用于数字键盘
 * 模拟电话按键的双音多频音效
 */
function playDial() {
  const ctx = getAudioContext()
  if (!ctx) return

  const t = ctx.currentTime

  // 创建两个振荡器模拟 DTMF 双音 (697Hz + 1209Hz)
  const osc1 = ctx.createOscillator()
  const osc2 = ctx.createOscillator()
  const gain = ctx.createGain()

  osc1.type = 'sine'
  osc2.type = 'sine'
  osc1.frequency.setValueAtTime(697, t)  // 低频
  osc2.frequency.setValueAtTime(1209, t) // 高频

  // 连接节点
  osc1.connect(gain)
  osc2.connect(gain)
  gain.connect(ctx.destination)

  // 设置音量和包络
  gain.gain.setValueAtTime(0.3, t) // 音量不宜过大
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15)

  osc1.start(t)
  osc2.start(t)
  osc1.stop(t + 0.15)
  osc2.stop(t + 0.15)

  // 震动反馈
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'light' })
  }
}

/**
 * 木鱼音 (Wood) - 用于普通按钮
 * 使用三角波产生空灵感
 */
function playWood() {
  const ctx = getAudioContext()
  if (!ctx) return

  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  // 三角波产生空灵感
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(400, t)

  // 快速淡出
  gain.gain.setValueAtTime(0.6, t)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)

  osc.start(t)
  osc.stop(t + 0.1)

  // 震动反馈
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'light' })
  }
}

/**
 * 确认音 - 用于确认操作
 * 音调上扬，给人积极反馈
 */
function playConfirm() {
  const ctx = getAudioContext()
  if (!ctx) return

  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  // 正弦波，音调上扬
  osc.type = 'sine'
  osc.frequency.setValueAtTime(523.25, t) // C5
  osc.frequency.exponentialRampToValueAtTime(1046.5, t + 0.1) // C6

  // 音量包络
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.4, t + 0.05)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)

  osc.start(t)
  osc.stop(t + 0.3)

  // 震动反馈
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'medium' })
  }
}

/**
 * 删除/返回音 - 用于删除操作
 * 音调下降，给人撤销感
 */
function playDelete() {
  const ctx = getAudioContext()
  if (!ctx) return

  const t = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()

  osc.connect(gain)
  gain.connect(ctx.destination)

  // 方波，音调下降
  osc.type = 'square'
  osc.frequency.setValueAtTime(400, t)
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.15)

  // 音量包络
  gain.gain.setValueAtTime(0.3, t)
  gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15)

  osc.start(t)
  osc.stop(t + 0.15)

  // 震动反馈
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'light' })
  }
}

/**
 * 胜利音 - 用于胜利时刻
 * 播放三个音符组成的胜利音效 (C5-E5-G5)
 */
function playVictory() {
  const ctx = getAudioContext()
  if (!ctx) return

  const t = ctx.currentTime

  // 播放三个音符组成胜利音效
  const notes = [
    { freq: 523.25, time: 0 },      // C5
    { freq: 659.25, time: 0.1 },    // E5
    { freq: 783.99, time: 0.2 }     // G5
  ]

  notes.forEach(note => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.type = 'sine'
    osc.frequency.setValueAtTime(note.freq, t + note.time)

    gain.gain.setValueAtTime(0, t + note.time)
    gain.gain.linearRampToValueAtTime(0.5, t + note.time + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.01, t + note.time + 0.4)

    osc.start(t + note.time)
    osc.stop(t + note.time + 0.4)
  })

  // 强烈震动反馈
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'heavy' })
  }
}

/**
 * 播放指定类型的音效
 * @param {string} type - 音效类型: click, confirm, delete, victory
 */
function playSound(type = 'click') {
  switch(type) {
    case 'click':
      playWood()
      break
    case 'confirm':
      playConfirm()
      break
    case 'delete':
      playDelete()
      break
    case 'victory':
      playVictory()
      break
    default:
      playWood()
  }
}

// ==================== 震动反馈函数 ====================

/**
 * 轻震动反馈
 * 适用于普通按钮点击
 */
function lightFeedback() {
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'light' })
  }
}

/**
 * 中等震动反馈
 * 适用于确认操作
 */
function mediumFeedback() {
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'medium' })
  }
}

/**
 * 重震动反馈
 * 适用于重要操作或胜利
 */
function heavyFeedback() {
  if (isVibrationEnabled && wx.vibrateShort) {
    wx.vibrateShort({ type: 'heavy' })
  }
}

// ==================== 便捷音效函数 ====================

/**
 * 数字键盘按键反馈 - 使用拨号音
 */
function keyTap() {
  if (isSoundEffectEnabled) {
    playDial()
  }
}

/**
 * 确认按钮反馈 - 使用确认音
 */
function confirmTap() {
  if (isSoundEffectEnabled) {
    playConfirm()
  }
}

/**
 * 删除/清除按钮反馈 - 使用删除音
 */
function deleteTap() {
  if (isSoundEffectEnabled) {
    playDelete()
  }
}

/**
 * 胜利反馈 - 使用胜利音
 */
function victoryTap() {
  if (isSoundEffectEnabled) {
    playVictory()
  }
}

// ==================== 模块导出 ====================

module.exports = {
  // 初始化
  initAudio,
  initBGM,

  // BGM 控制
  playBGM,
  pauseBGM,
  stopBGM,
  toggleBGM,
  getBGMStatus,

  // 震动控制
  toggleVibration,
  getVibrationEnabled,

  // 按钮音效控制
  toggleSoundEffect,
  getSoundEffectEnabled,

  // 通用音效
  playSound,
  playDial,
  playWood,
  playConfirm,
  playDelete,
  playVictory,

  // 震动反馈
  lightFeedback,
  mediumFeedback,
  heavyFeedback,

  // 便捷音效
  keyTap,
  confirmTap,
  deleteTap,
  victoryTap
}
