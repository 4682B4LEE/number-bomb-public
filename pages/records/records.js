const app = getApp()
const HistoryManager = require('../../utils/historyManager.js')

Page({
  data: {
    // 控制加载动画的状态
    isLoading: true,
    // 当前选中的游戏模式: 'number' | 'color' | 'online'
    activeMode: 'number',
    // 当前显示的记录
    currentRecords: [],
    // 当前模式的统计数据
    currentStats: {
      winRate: '0.0',
      totalMatches: 0
    },
    // 长按菜单显示状态
    showActionMenu: false,
    // 当前选中的记录
    selectedRecord: null,
    // 删除确认弹窗显示状态
    showDeleteConfirm: false,
    // 是否正在刷新（用于下拉刷新）
    isRefreshing: false
    // 注意：数据迁移功能已取消，相关字段已移除
  },

  // 上次加载时间戳（用于防抖）
  lastLoadTime: 0,

  onLoad() {
    // 页面加载时根据模式加载数据
    const { activeMode } = this.data

    if (activeMode === 'online') {
      // 联机模式：检查今天是否已经缓存过
      this.loadOnlineRecordsWithCache()
    } else {
      // 本地模式：直接加载
      this.loadRecords()
    }
    // 历史记录导入功能已取消
  },

  onShow() {
    const { activeMode } = this.data

    // 本地模式：每次显示都加载（本地读取无成本）
    if (activeMode !== 'online') {
      this.loadRecords()
    }
    // 联机模式：onShow 时不自动刷新，保持当前显示的数据
    // 用户需要手动下拉刷新来获取最新数据
  },

  // 加载联机记录（带缓存逻辑）
  loadOnlineRecordsWithCache() {
    const lastFetchDate = wx.getStorageSync('onlineRecordsLastFetchDate')
    const today = new Date().toDateString()

    // 如果今天还没有缓存过，则从云端获取
    if (lastFetchDate !== today) {
      console.log('联机记录今天首次访问，从云端获取')
      this.loadRecordsFromCloud()
    } else {
      console.log('联机记录今天已缓存，从本地缓存加载')
      // 从缓存加载
      const cachedRecords = wx.getStorageSync('onlineRecordsCache')
      if (cachedRecords) {
        console.log('获取本地缓存联机记录:', cachedRecords.length, '条')
        this.setData({
          currentRecords: cachedRecords,
          currentStats: this.calculateStats(cachedRecords),
          isLoading: false
        })
      } else {
        // 缓存不存在，从云端获取
        this.loadRecordsFromCloud()
      }
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ isRefreshing: true })
    this.refreshRecords()
    // 1秒后关闭刷新状态
    setTimeout(() => {
      this.setData({ isRefreshing: false })
    }, 1000)
  },

  // 刷新记录（手动刷新）
  refreshRecords() {
    const { activeMode } = this.data
    if (activeMode === 'online') {
      this.loadRecordsFromCloud()
    } else {
      this.loadRecords()
    }
  },

  // 加载对局记录
  loadRecords() {
    const { activeMode } = this.data
    console.log('开始加载对局记录，模式:', activeMode)
    // 更新上次加载时间
    this.lastLoadTime = Date.now()
    this.setData({ isLoading: true })

    // 单人/本地双人模式使用本地存储，联机模式使用缓存或云端
    if (activeMode === 'online') {
      // 联机模式：先检查缓存，今天已缓存则使用缓存
      this.loadOnlineRecordsWithCache()
      return
    }

    // 本地模式：从本地获取（无需缓存，本地读取无成本）
    try {
      const localRecords = HistoryManager.getRecords()
      console.log('获取本地对局记录:', localRecords.length, '条', '(本地模式)')

      // 根据当前模式筛选记录
      let filteredRecords = []
      if (activeMode === 'number') {
        // 猜数字模式：显示 gt 为 number 或 undefined 的记录（兼容旧数据）
        filteredRecords = localRecords.filter(r => !r.gt || r.gt === 'number')
      } else if (activeMode === 'color') {
        // 猜颜色模式：显示 gt 为 color 的记录
        filteredRecords = localRecords.filter(r => r.gt === 'color')
      }

      // 获取本地收藏的记录ID
      const favoriteIds = new Set(HistoryManager.getFavoriteIds())

      // 格式化记录
      const records = this.formatRecords(filteredRecords)

      // 标记收藏状态
      records.forEach(record => {
        if (favoriteIds.has(record.id)) {
          record.isFavorite = true
        }
      })

      this.setData({
        currentRecords: records
      })

      // 计算统计数据
      const stats = this.calculateStats(records)
      this.setData({
        currentStats: stats
      })
    } catch (e) {
      console.error('加载本地记录失败:', e)
    } finally {
      this.setData({ isLoading: false })
    }
  },

  // 从云端加载联机记录（带缓存）
  loadRecordsFromCloud() {
    console.log('从云端加载联机对局记录')
    this.setData({ isLoading: true })
    this.lastLoadTime = Date.now()

    // 联机模式：从云端获取 + 本地收藏
    wx.cloud.callFunction({
      name: 'getRecords',
      data: {
        mode: 'online'
      },
      success: (res) => {
        console.log('获取云端联机对局记录结果:', res)
        if (res.result.success) {
          // 获取云端记录
          const cloudRecords = res.result.data || []

          // 获取本地收藏的联机对战记录
          const favoriteRecords = HistoryManager.getOnlineFavorites()

          // 过滤云端记录：去除已收藏的记录（避免重复显示）
          const favoriteIds = new Set(favoriteRecords.map(f => f._id))
          const filteredCloudRecords = cloudRecords.filter(r => !favoriteIds.has(r._id))

          // 合并记录：收藏的记录置顶，然后是云端记录
          // 先合并，再按时间排序（新的在上）
          const allRecords = [...favoriteRecords, ...filteredCloudRecords]

          // 按时间排序（新的在上）
          allRecords.sort((a, b) => {
            const timeA = a.ct || a.createTime || 0
            const timeB = b.ct || b.createTime || 0
            return new Date(timeB).getTime() - new Date(timeA).getTime()
          })

          // 格式化记录
          const records = this.formatRecords(allRecords)

          // 标记收藏状态
          records.forEach(record => {
            if (favoriteIds.has(record._id)) {
              record.isFavorite = true
              record.isOnlineFavorite = true
            }
          })

          // 更新页面数据
          this.setData({
            currentRecords: records,
            currentStats: this.calculateStats(records)
          })

          // 缓存到本地
          wx.setStorageSync('onlineRecordsCache', records)
          wx.setStorageSync('onlineRecordsLastFetchDate', new Date().toDateString())

          console.log('联机记录已缓存到本地:', records.length, '条')
        } else {
          console.log('获取记录失败:', res.result.message)
          wx.showToast({
            title: res.result.message || '获取记录失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('获取对局记录失败', err)
        wx.showToast({
          title: '获取记录失败',
          icon: 'none'
        })
      },
      complete: () => {
        this.setData({ isLoading: false })
      }
    })
  },

  // 格式化对局记录
  formatRecords(records) {
    return records.map(record => {
      // 解析时间戳
      const timestamp = record.ct || record.createTime || record.ts || Date.now()
      const date = new Date(timestamp)

      // 格式化日期：MM-DD HH:mm
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const formattedDate = `${month}-${day} ${hours}:${minutes}`

      // 判断是否为联机对战（独立判定，不与其他模式混杂）
      const isOnline = record.gt === 'online' || record._id  // 有 _id 说明是云端记录

      // 判断是否为单人模式
      const isSingleMode = record.sm === true

      // 获取玩家名称
      let player1Name = record.p1 || record.player1Name || '玩家1'
      let player2Name = record.p2 || record.player2Name || '玩家2'

      // 单人模式：P2 显示为"系统"
      if (isSingleMode) {
        player2Name = '系统'
      }

      // ==================== 联机模式独立判定 ====================
      if (isOnline) {
        return this.formatOnlineRecord(record, formattedDate, player1Name, player2Name)
      }

      // ==================== 非联机模式判定（本地模式） ====================
      return this.formatLocalRecord(record, formattedDate, isSingleMode, player1Name, player2Name)
    })
  },

  // ==================== 联机猜数字判定 ====================
  formatOnlineNumberRecord(record, formattedDate, player1Name, player2Name) {
    // 联机猜数字：winner 字段是 'host'、'guest'、null、undefined 或空字符串
    let winner = record.w  // 'host', 'guest', null, undefined 或 ''
    const myRole = record.mr  // 当前用户角色：'host' 或 'guest'

    // 处理空字符串情况（云端可能返回空字符串而不是 null）
    if (winner === '') {
      winner = null
    }

    // 确定获胜者显示
    let winnerName = ''
    let p1Result = '败'
    let p2Result = '败'

    if (winner === 'host') {
      winnerName = player1Name
      p1Result = '胜'
      p2Result = '败'
    } else if (winner === 'guest') {
      winnerName = player2Name
      p1Result = '败'
      p2Result = '胜'
    }
    // 联机猜数字没有平局，只有胜负

    // 当前用户是否获胜（优先使用云端保存的 iw 字段）
    let isWin = false
    if (record.iw !== undefined) {
      isWin = record.iw === true
    } else {
      isWin = (winner === myRole)
    }

    // 结果文本
    let resultText = isWin ? '胜利' : '失败'
    let displayResultText = winnerName ? `${winnerName}胜利` : (isWin ? '胜利' : '失败')

    // 模式标签
    const digitCount = record.dc || 4
    const digitRule = record.dr === 'unique' ? '不重复' : '可重复'
    const timeLimit = record.tl || 0
    const duelMode = record.qd === true

    let modeText = `${digitCount}位数字(${digitRule})`
    if (duelMode) {
      modeText = `⚡${digitCount}位(${digitRule})`
    } else if (timeLimit > 0) {
      modeText = `⏱️${digitCount}位(${digitRule})`
    }

    return {
      ...record,
      formattedDate,
      isOnline: true,
      isSingleMode: false,
      player1Name,
      player2Name,
      result: isWin ? 'win' : 'lose',
      isWin,
      isDraw: false,
      modeLabel: modeText,
      gameModeText: modeText,
      guessCount: record.gc || 0,
      winnerName,
      winner: winner === 'host' ? 1 : (winner === 'guest' ? 2 : 0),
      p1Result,
      p2Result,
      resultText: displayResultText,
      quickDrawMode: record.qd === true,
      duelMode: record.qd === true,
      gameType: 'online',
      isTimeout: record.rs === 'timeout'
    }
  },

  // ==================== 联机猜颜色判定 ====================
  formatOnlineColorRecord(record, formattedDate, player1Name, player2Name) {
    // 联机猜颜色：winner 字段是 'host'、'guest'、null、undefined 或空字符串
    let winner = record.w  // 'host', 'guest', null, undefined 或 ''
    const myRole = record.mr  // 当前用户角色：'host' 或 'guest'
    const reason = record.rs  // 结束原因

    // 处理空字符串情况（云端可能返回空字符串而不是 null）
    if (winner === '') {
      winner = null
    }

    // 确定获胜者显示
    let winnerName = ''
    let p1Result = '败'
    let p2Result = '败'
    let isDraw = false

    if (winner === 'host') {
      winnerName = player1Name
      p1Result = '胜'
      p2Result = '败'
    } else if (winner === 'guest') {
      winnerName = player2Name
      p1Result = '败'
      p2Result = '胜'
    } else {
      // winner 为 null 或 undefined：无人获胜
      if (reason === 'out_of_guesses') {
        // 8轮都没猜对：双方都失败
        winnerName = '失败'
        p1Result = '败'
        p2Result = '败'
        isDraw = false
      } else {
        // 其他情况（如时间到）：平局
        winnerName = '平局'
        p1Result = '平'
        p2Result = '平'
        isDraw = true
      }
    }

    // 当前用户是否获胜（使用原始 record.iw 或根据 winner 计算）
    let isWin = false
    if (record.iw !== undefined) {
      // 优先使用云端保存的 iw 字段
      isWin = record.iw === true
    } else {
      // 否则根据 winner 计算
      isWin = (winner === myRole)
    }

    // 结果文本
    let resultText = isDraw ? '平局' : (isWin ? '胜利' : '失败')
    let displayResultText = ''
    if (isDraw) {
      displayResultText = '平局'
    } else if (winner === null || winner === undefined) {
      // 双方都失败
      displayResultText = '失败'
    } else {
      displayResultText = `${winnerName}胜利`
    }

    // 模式标签
    const colorMode = record.cm === 'unique' ? '不重复' : '可重复'
    const duelMode = record.dm === true

    let modeText = `🎨猜颜色(${colorMode})`
    if (duelMode) {
      modeText = `⚡猜颜色(${colorMode})`
    }

    return {
      ...record,
      formattedDate,
      isOnline: true,
      isSingleMode: false,
      player1Name,
      player2Name,
      result: isWin ? 'win' : (isDraw ? 'draw' : 'lose'),
      isWin,
      isDraw,
      modeLabel: modeText,
      gameModeText: modeText,
      guessCount: record.gc || 0,
      winnerName,
      winner: winner === 'host' ? 1 : (winner === 'guest' ? 2 : 0),
      p1Result,
      p2Result,
      resultText: displayResultText,
      quickDrawMode: record.dm === true,
      duelMode: record.dm === true,
      gameType: 'online',
      isTimeout: record.rs === 'timeout'
    }
  },

  // ==================== 联机模式总入口 ====================
  formatOnlineRecord(record, formattedDate, player1Name, player2Name) {
    // 根据游戏类型分发到不同的判定逻辑
    const gameType = record.gt

    if (gameType === 'color') {
      // 联机猜颜色
      return this.formatOnlineColorRecord(record, formattedDate, player1Name, player2Name)
    } else {
      // 联机猜数字（默认）
      return this.formatOnlineNumberRecord(record, formattedDate, player1Name, player2Name)
    }
  },

  // ==================== 本地模式总入口 ====================
  formatLocalRecord(record, formattedDate, isSingleMode, player1Name, player2Name) {
    // 根据游戏类型分发到不同的判定逻辑
    const gameType = record.gt

    if (gameType === 'color') {
      // 本地猜颜色（单人/本地双人）
      return this.formatLocalColorRecord(record, formattedDate, isSingleMode, player1Name, player2Name)
    } else {
      // 本地猜数字（单人/本地双人）
      return this.formatLocalNumberRecord(record, formattedDate, isSingleMode, player1Name, player2Name)
    }
  },

  // ==================== 本地猜数字判定 ====================
  formatLocalNumberRecord(record, formattedDate, isSingleMode, player1Name, player2Name) {
    // 判断胜负
    let result = 'unknown'
    let isWin = false
    let isDraw = false

    if (record.rs === 'timeout' || record.rs === 'out_of_guesses') {
      // 时间到 或 次数用完：平局
      result = 'draw'
      isDraw = true
    } else if (record.rs === 'opponent_left') {
      // 对方离开：当前用户获胜
      result = 'win'
      isWin = true
    } else if (record.w !== undefined) {
      // 有明确的 winner 字段
      if (record.w === 0) {
        // 平局（时间到或次数用完）
        result = 'draw'
        isDraw = true
      } else if (record.iw === true) {
        // 当前用户获胜
        result = 'win'
        isWin = true
      } else if (record.iw === false) {
        // 当前用户失败
        result = 'lose'
        isWin = false
      } else {
        // iw 字段不存在时，根据 winner 判断
        if (record.w === 1) {
          result = 'win'
          isWin = true
        } else if (record.w === 2) {
          result = 'lose'
          isWin = false
        }
      }
    }

    // 模式标签
    const digitCount = record.dc || 4
    // 检查 dr 或 sdm 字段来判断可重复/不重复（sdm 用于单人模式）
    const digitRule = (record.dr === 'unique' || record.sdm === 'unique') ? '不重复' : '可重复'
    const modeLabel = `${digitCount}位数字(${digitRule})`

    // 获取轮次
    const guessCount = record.gc || 0

    // 获取胜利者名称
    let winnerName = ''
    if (record.w === 1) {
      winnerName = player1Name
    } else if (record.w === 2) {
      winnerName = player2Name
    } else if (record.w === 0) {
      winnerName = '平局'
    }

    // 结果文本
    let resultText = ''
    if (isDraw) {
      resultText = '平局'
    } else if (result === 'win') {
      resultText = '胜利'
    } else if (result === 'lose') {
      resultText = '失败'
    } else {
      resultText = '未知'
    }

    // 本地双人模式右上角显示获胜者昵称+胜利
    let displayResultText = resultText
    if (!isSingleMode && !isDraw && winnerName) {
      displayResultText = `${winnerName}胜利`
    }

    // 本地双人模式：确定P1/P2胜负显示
    let p1Result = '败'
    let p2Result = '败'
    if (isDraw) {
      p1Result = '平'
      p2Result = '平'
    } else if (record.w === 1) {
      p1Result = '胜'
      p2Result = '败'
    } else if (record.w === 2) {
      p1Result = '败'
      p2Result = '胜'
    }

    return {
      ...record,
      formattedDate,
      isOnline: false,
      isSingleMode,
      player1Name,
      player2Name,
      result,
      isWin,
      isDraw,
      modeLabel,
      gameModeText: modeLabel,
      guessCount,
      winnerName,
      winner: record.w,
      p1Result,
      p2Result,
      resultText: displayResultText,
      quickDrawMode: record.qd === true,
      duelMode: record.qd === true,
      gameType: record.gt,
      isTimeout: record.rs === 'timeout'
    }
  },

  // ==================== 本地猜颜色判定 ====================
  formatLocalColorRecord(record, formattedDate, isSingleMode, player1Name, player2Name) {
    // 判断胜负
    let result = 'unknown'
    let isWin = false

    if (record.iw === true) {
      // 当前用户获胜
      result = 'win'
      isWin = true
    } else if (record.iw === false) {
      // 当前用户失败（包括8次没猜对）
      result = 'lose'
      isWin = false
    } else if (record.w !== undefined) {
      // iw 字段不存在时，根据 winner 判断
      if (record.w === 1) {
        result = 'win'
        isWin = true
      } else if (record.w === 2) {
        result = 'lose'
        isWin = false
      } else if (record.w === 0) {
        // 无人获胜，显示失败
        result = 'lose'
        isWin = false
      }
    }

    // 猜颜色没有平局，只有胜负
    const isDraw = false

    // 模式标签
    const colorMode = record.cm === 'unique' ? '不重复' : '可重复'
    const modeLabel = `🎨猜颜色(${colorMode})`

    // 获取轮次
    const guessCount = record.gc || 0

    // 结果文本
    const resultText = isWin ? '胜利' : '失败'

    // 单人模式右上角显示胜利/失败
    // 本地双人模式右上角显示获胜者昵称+胜利
    let displayResultText = resultText
    if (!isSingleMode && record.w === 1) {
      displayResultText = `${player1Name}胜利`
    } else if (!isSingleMode && record.w === 2) {
      displayResultText = `${player2Name}胜利`
    }

    // 本地双人模式：确定P1/P2胜负显示
    let p1Result = '败'
    let p2Result = '败'
    if (record.w === 1) {
      p1Result = '胜'
      p2Result = '败'
    } else if (record.w === 2) {
      p1Result = '败'
      p2Result = '胜'
    }

    return {
      ...record,
      formattedDate,
      isOnline: false,
      isSingleMode,
      player1Name,
      player2Name,
      result,
      isWin,
      isDraw,
      modeLabel,
      gameModeText: modeLabel,
      guessCount,
      winnerName: record.w === 1 ? player1Name : (record.w === 2 ? player2Name : ''),
      winner: record.w,
      p1Result,
      p2Result,
      resultText: displayResultText,
      quickDrawMode: false,
      duelMode: false,
      gameType: record.gt,
      isTimeout: false
    }
  },

  // 计算统计数据
  calculateStats(records) {
    const totalMatches = records.length
    if (totalMatches === 0) {
      return {
        winRate: '0.0',
        totalMatches: 0
      }
    }

    // 只统计有明确胜负的记录（排除平局）
    const decisiveMatches = records.filter(r => !r.isDraw)
    const winCount = decisiveMatches.filter(r => r.isWin).length
    const totalDecisive = decisiveMatches.length

    const winRate = totalDecisive > 0
      ? ((winCount / totalDecisive) * 100).toFixed(1)
      : '0.0'

    return {
      winRate,
      totalMatches
    }
  },

  // 切换游戏模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.activeMode) return

    this.setData({
      activeMode: mode,
      currentRecords: [],
      isLoading: true
    })

    // 切换模式后重新加载记录
    // 联机模式使用缓存逻辑，本地模式直接加载
    if (mode === 'online') {
      this.loadOnlineRecordsWithCache()
    } else {
      this.loadRecords()
    }
  },

  // 查看对局详情
  viewDetail(e) {
    const record = e.currentTarget.dataset.record
    console.log('查看对局详情:', record)

    // 联机对战记录：直接跳转到详情页
    if (record.isOnline || record.gt === 'online') {
      // 保存记录ID到全局数据
      app.globalData.currentRecordId = record._id
      app.globalData.currentRecordData = record

      wx.navigateTo({
        url: '/pages/record-detail/record-detail?id=' + record._id
      })
      return
    }

    // 本地对战记录：直接跳转到详情页
    // 构建查询参数
    const params = {
      id: record.id || record._id,
      gt: record.gt || 'number',
      mode: this.data.activeMode
    }

    const queryString = Object.keys(params)
      .map(key => `${key}=${encodeURIComponent(params[key])}`)
      .join('&')

    wx.navigateTo({
      url: `/pages/record-detail/record-detail?${queryString}`
    })
  },

  // 长按显示操作菜单
  onLongPress(e) {
    const record = e.currentTarget.dataset.record
    this.setData({
      showActionMenu: true,
      selectedRecord: record
    })
  },

  // 隐藏操作菜单
  hideActionMenu() {
    this.setData({
      showActionMenu: false,
      selectedRecord: null
    })
  },

  // 收藏/取消收藏
  toggleFavorite() {
    const { selectedRecord, activeMode } = this.data
    if (!selectedRecord) return

    // 联机对战收藏
    if (activeMode === 'online' || selectedRecord.isOnline) {
      if (selectedRecord.isFavorite) {
        // 取消收藏
        HistoryManager.removeOnlineFavorite(selectedRecord._id)
        wx.showToast({ title: '已取消收藏', icon: 'success' })
      } else {
        // 添加收藏
        const success = HistoryManager.addOnlineFavorite(selectedRecord)
        if (success) {
          wx.showToast({ title: '已收藏', icon: 'success' })
        } else {
          wx.showToast({ title: '收藏失败，可能已达上限', icon: 'none' })
        }
      }
    } else {
      // 本地对战收藏
      if (selectedRecord.isFavorite) {
        // 取消收藏
        HistoryManager.unfavoriteRecord(selectedRecord.id || selectedRecord._id)
        wx.showToast({ title: '已取消收藏', icon: 'success' })
      } else {
        // 添加收藏
        const success = HistoryManager.favoriteRecord(selectedRecord.id || selectedRecord._id)
        if (success) {
          wx.showToast({ title: '已收藏', icon: 'success' })
        } else {
          wx.showToast({ title: '收藏失败，可能已达上限', icon: 'none' })
        }
      }
    }

    // 隐藏菜单并刷新列表
    this.hideActionMenu()
    this.loadRecords()
  },

  // 显示删除确认弹窗
  showDeleteConfirm() {
    this.setData({
      showDeleteConfirm: true,
      showActionMenu: false
    })
  },

  // 隐藏删除确认弹窗
  hideDeleteConfirm() {
    this.setData({
      showDeleteConfirm: false
    })
  },

  // 确认删除
  confirmDelete() {
    const { selectedRecord, activeMode } = this.data
    if (!selectedRecord) return

    // 联机对战记录不能删除（云端数据）
    if (activeMode === 'online' || selectedRecord.isOnline) {
      wx.showToast({ title: '联机记录不能删除', icon: 'none' })
      this.hideDeleteConfirm()
      return
    }

    // 删除本地记录
    const recordId = selectedRecord.id || selectedRecord._id
    const success = HistoryManager.deleteRecord(recordId)

    if (success) {
      wx.showToast({ title: '已删除', icon: 'success' })
    } else {
      wx.showToast({ title: '删除失败', icon: 'none' })
    }

    // 隐藏弹窗并刷新列表
    this.hideDeleteConfirm()
    this.loadRecords()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 对局记录',
      path: '/pages/records/records',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 对局记录',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
})
