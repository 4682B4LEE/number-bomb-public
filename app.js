/**
 * ============================================================================
 * 双人猜数对决 - 小程序入口文件
 * ============================================================================
 * 
 * 【文件说明】
 * 这是微信小程序的入口文件，负责：
 * 1. 定义全局数据状态（猜数字、猜颜色游戏数据）
 * 2. 初始化微信云开发环境
 * 3. 处理小程序版本更新检测
 * 
 * 【技术栈】
 * - 微信小程序原生框架
 * - 微信云开发 (CloudBase)
 * 
 * 【作者】
 * 源码版本 - 可对外售卖
 * ============================================================================
 */

App({
  /**
   * 全局数据对象
   * 存储所有游戏模式的状态数据，可在各页面通过 getApp().globalData 访问
   */
  globalData: {
    // ========== 猜数字游戏数据 ==========
    digitCount: 4,              // 默认数字位数（4位数字）
    p1Name: '玩家1',            // 玩家1名称（默认显示）
    p2Name: '玩家2',            // 玩家2名称（默认显示）
    p1Secret: '',               // 玩家1设定的密码（4位数字）
    p2Secret: '',               // 玩家2设定的密码（4位数字）
    p1Guesses: [],              // 玩家1的猜测历史记录数组
    p2Guesses: [],              // 玩家2的猜测历史记录数组
    currentTurnPlayer: 1,       // 当前回合玩家（1或2）
    winner: null,               // 获胜者（1或2，null表示未分出胜负）
    currentRecordId: null,      // 当前对局记录ID（用于云端记录更新）

    // 先后手相关数据
    firstSetSecretPlayer: null, // 先手设置密码的玩家（1或2）
    secondSetSecretPlayer: null,// 后手设置密码的玩家（1或2）
    firstGuessPlayer: null,     // 先手猜测的玩家（1或2）
    
    // ========== 猜颜色游戏数据 ==========
    colorMode: 'repeat',        // 颜色模式：'repeat'(可重复) / 'unique'(不重复)
    colorSecret: null,          // 当前颜色密码（被猜测的颜色组合）
    p1ColorSecret: null,        // P1设置的颜色密码
    p2ColorSecret: null,        // P2设置的颜色密码
    colorGuesses: {             // 颜色猜测历史（按玩家分组）
      p1: [],                   // 玩家1的颜色猜测记录
      p2: []                    // 玩家2的颜色猜测记录
    },
    colorCurrentTurn: 1,        // 当前回合玩家（1或2）
    colorWinner: null,          // 颜色模式获胜者（1或2）
    colorFirstPlayer: null,     // 颜色模式先手玩家（1或2）
    
    // ========== 通用数据 ==========
    gameType: null,             // 当前游戏类型：'number'(猜数字) 或 'color'(猜颜色)
    userInfo: null              // 微信用户信息（头像、昵称等）
  },

  /**
   * 小程序启动生命周期函数
   * 在小程序初始化完成时触发，全局只触发一次
   */
  onLaunch() {
    console.log('小程序启动')
    // 初始化云开发环境
    this.initCloud()
    // 检测小程序是否有新版本
    this.checkForUpdate()
  },

  /**
   * 初始化微信云开发环境
   * 【配置说明】
   * - env: 使用 DYNAMIC_CURRENT_ENV 自动选择当前环境
   * - traceUser: 记录用户访问日志，便于统计分析
   * 
   * 【注意】使用前需在微信开发者工具中开通云开发
   */
  initCloud() {
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV, // 使用动态环境（自动选择当前环境）
      traceUser: true                     // 开启用户访问跟踪
    })
  },

  /**
   * 检测小程序版本更新
   * 【功能说明】
   * 当小程序发布新版本后，自动检测并提示用户更新
   * 使用微信提供的更新管理器 API 实现
   */
  checkForUpdate() {
    // 获取小程序更新管理器实例
    const updateManager = wx.getUpdateManager()

    // 监听向微信后台请求检查更新结果事件
    updateManager.onCheckForUpdate((res) => {
      // 有新版本时会在 onUpdateReady 回调中处理
      // res.hasUpdate 表示是否有新版本
    })

    // 监听小程序有版本更新事件
    // 当新版本下载完成后触发
    updateManager.onUpdateReady(() => {
      // 弹出模态框提示用户更新
      wx.showModal({
        title: '发现新版本',
        content: '新版本已准备好，点击确定立即更新体验新功能！',
        showCancel: false,    // 不允许取消，必须更新
        confirmText: '立即更新',
        success: (res) => {
          if (res.confirm) {
            // 用户确认后，应用新版本并重启小程序
            updateManager.applyUpdate()
          }
        }
      })
    })

    // 监听小程序更新失败事件
    updateManager.onUpdateFailed(() => {
      console.error('新版本下载失败')
      wx.showModal({
        title: '更新失败',
        content: '新版本下载失败，请检查网络后重试',
        showCancel: false,
        confirmText: '知道了'
      })
    })
  }
})
