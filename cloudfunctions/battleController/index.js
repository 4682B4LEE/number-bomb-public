const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 颜色常量
const COLORS = ['red', 'green', 'blue', 'yellow', 'purple', 'gray']

// 安全的 A/B 计算（猜数字用）
function calculateAB(guess, secret) {
  let a = 0, b = 0
  const guessArr = String(guess).split('')
  const secretArr = String(secret).split('')
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] === secretArr[i]) { a++; guessArr[i] = null; secretArr[i] = null; }
  }
  for (let i = 0; i < guessArr.length; i++) {
    if (guessArr[i] !== null) {
      const idx = secretArr.indexOf(guessArr[i])
      if (idx !== -1) { b++; secretArr[idx] = null; }
    }
  }
  return { a, b }
}

// 计算颜色提示（红/白点）- 猜颜色用
function calculateColorHints(guessColors, secretColors) {
  let red = 0   // 位置和颜色都对
  let white = 0 // 颜色对位置错
  
  const secretCopy = [...secretColors]
  const guessCopy = [...guessColors]
  
  // 第一步：计算红点（位置和颜色都对）
  for (let i = 0; i < 4; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      red++
      secretCopy[i] = null
      guessCopy[i] = null
    }
  }
  
  // 第二步：计算白点（颜色对位置错）
  for (let i = 0; i < 4; i++) {
    if (guessCopy[i] !== null) {
      const index = secretCopy.indexOf(guessCopy[i])
      if (index !== -1) {
        white++
        secretCopy[index] = null
      }
    }
  }
  
  return { red, white }
}

// 生成颜色密码
function generateColorSecret(colorMode) {
  let secret = []
  
  if (colorMode === 'unique') {
    // 颜色不重复模式：从6个颜色中随机选4个不重复的
    const shuffled = [...COLORS].sort(() => Math.random() - 0.5)
    secret = shuffled.slice(0, 4)
  } else {
    // 颜色可重复模式：最多只能有1个颜色重复（即最多2个珠子颜色相同）
    // 且不能有2对重复（如 red,red,green,green）
    // 四个珠子里，至少要有3个不同的颜色
    secret = []
    for (let i = 0; i < 4; i++) {
      secret.push(COLORS[Math.floor(Math.random() * COLORS.length)])
    }
    
    // 检查颜色分布
    const colorCount = {}
    secret.forEach(c => {
      colorCount[c] = (colorCount[c] || 0) + 1
    })
    
    const counts = Object.values(colorCount)
    const maxCount = Math.max(...counts)
    const pairCount = counts.filter(c => c === 2).length
    
    // 不满足条件的情况：
    // 1. 有颜色出现3次或4次
    // 2. 有2对重复（如 red,red,green,green）
    if (maxCount > 2 || pairCount > 1) {
      return generateColorSecret(colorMode)
    }
  }
  
  return secret
}

exports.main = async (event, context) => {
  // 参数可能在 event.data 中，也可能直接在 event 中
  const data = event.data || event
  const openid = cloud.getWXContext().OPENID

  try {
    switch (data.action) {
      case 'createRoom': return await createRoom(data, openid)
      case 'joinRoom': return await joinRoom(data, openid)
      case 'setSecret': return await setSecret(data, openid)
      case 'submitGuess': return await submitGuess(data, openid)
      case 'submitColorGuess': return await submitColorGuess(data, openid)
      case 'heartbeat': return await heartbeat(data, openid)
      case 'leaveRoom': return await leaveRoom(data, openid)
      case 'reconnect': return await reconnect(data, openid)
      case 'getRoomStatus': return await getRoomStatus(data, openid)
      case 'finishRoom': return await finishRoom(data, openid)
      case 'setGameEndTime': return await setGameEndTime(data, openid)
      case 'finishByTimeout': return await finishByTimeout(data, openid)
      // 再来一局相关
      case 'rematch': return await rematch(data, openid)
      case 'acceptRematch': return await acceptRematch(data, openid)
      case 'cancelRematch': return await cancelRematch(data, openid)
      case 'expireRematch': return await expireRematch(data, openid)
      default: return { success: false, error: '未知操作' }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// ================= 战绩记录辅助函数 =================

async function saveBattleRecord(roomId, room, secrets, winnerRole, reason) {

  // 检查房间数据完整性
  if (!room || !room.players) {
    return
  }
  if (!room.players.host || !room.players.guest) {
    return
  }

  const now = new Date()
  const createTime = room.createTime || now
  const duration = Math.floor((now.getTime() - new Date(createTime).getTime()) / 1000) || 0

  // 确保 secrets 不为 null
  const safeSecrets = secrets || {}

  try {
    // 从 user_avatars 表获取双方最新头像
    const hostOpenid = room.players.host.openid
    const guestOpenid = room.players.guest.openid
    
    let hostAvatar = room.players.host.avatar || ''
    let guestAvatar = room.players.guest.avatar || ''
    
    try {
      // 获取房主最新头像
      console.log('获取房主头像:', hostOpenid)
      const hostAvatarRes = await db.collection('user_avatars').doc(hostOpenid).get()
      console.log('房主头像查询结果:', hostAvatarRes)
      if (hostAvatarRes && hostAvatarRes.data && hostAvatarRes.data.avatar) {
        hostAvatar = hostAvatarRes.data.avatar
        console.log('使用房主最新头像:', hostAvatar)
      } else {
        console.log('房主头像不存在，使用房间中的头像:', hostAvatar)
      }
      
      // 获取客人最新头像
      console.log('获取客人头像:', guestOpenid)
      const guestAvatarRes = await db.collection('user_avatars').doc(guestOpenid).get()
      console.log('客人头像查询结果:', guestAvatarRes)
      if (guestAvatarRes && guestAvatarRes.data && guestAvatarRes.data.avatar) {
        guestAvatar = guestAvatarRes.data.avatar
        console.log('使用客人最新头像:', guestAvatar)
      } else {
        console.log('客人头像不存在，使用房间中的头像:', guestAvatar)
      }
    } catch (e) {
      console.log('获取用户头像失败，使用房间中的头像:', e)
    }
    
    // 将最新头像保存到 room 对象中
    room.players.host.avatar = hostAvatar
    room.players.guest.avatar = guestAvatar

    const hostRecord = buildRecord(room, safeSecrets, 'host', winnerRole, reason, duration, now)
    const guestRecord = buildRecord(room, safeSecrets, 'guest', winnerRole, reason, duration, now)


    // 核心修复：彻底清洗 undefined，防止微信数据库 add() 崩溃
    const cleanHostRecord = JSON.parse(JSON.stringify(hostRecord))
    const cleanGuestRecord = JSON.parse(JSON.stringify(guestRecord))

    // db.serverDate() 无法被序列化，需重新赋值
    cleanHostRecord.et = db.serverDate()
    cleanGuestRecord.et = db.serverDate()


    const results = await Promise.all([
      db.collection('records').add({ data: cleanHostRecord }).catch(e=>{
        return { error: e.message }
      }),
      db.collection('records').add({ data: cleanGuestRecord }).catch(e=>{
        return { error: e.message }
      })
    ])

  } catch (err) {
  }
}

function buildRecord(room, secrets, myRole, winnerRole, reason, duration, now) {
  // 固定：p1 永远是房主(host)，p2 永远是被邀请者(guest)
  const hostPlayer = room.players.host || {}
  const guestPlayer = room.players.guest || {}

  const history = room.history || []
  const myGuessCount = history.filter(h => h.endsWith(':' + myRole)).length
  const opponentGuessCount = history.length - myGuessCount

  // 计算 isWin
  const isWin = (winnerRole === myRole)

  // 判断游戏类型
  const isColorGame = room.gameType === 'color'
  
  // 处理密码字段
  let mySecret = ''
  let opponentSecret = ''
  
  if (isColorGame) {
    // 猜颜色：使用 colorSecret 作为密码（系统出题，双方密码相同）
    const colorSecret = room.colorSecret || []
    mySecret = colorSecret
    opponentSecret = colorSecret
  } else {
    // 猜数字：使用 secrets 中的密码
    mySecret = (secrets && secrets[myRole + 'Secret']) || ''
    opponentSecret = (secrets && secrets[(myRole === 'host' ? 'guest' : 'host') + 'Secret']) || ''
  }

  // 确保所有字段都有默认值，防止 undefined
  const record = {
    _openid: myRole === 'host' ? hostPlayer.openid : guestPlayer.openid, // 当前用户的 openid
    gt: room.gameType || 'number',           // 游戏类型：number/color
    gm: 'online',
    // 猜数字字段
    dc: room.digitCount || 4,                // 位数
    dr: room.digitRule || 'repeat',          // 数字规则
    // 猜颜色字段（新增）
    cm: room.colorMode || 'repeat',          // 颜色模式
    cs: room.colorSecret || [],              // 颜色密码
    fp: room.firstPlayer || 'host',          // 先手玩家
    // 快枪手模式（猜数字）
    qd: room.quickDrawMode || false,         // 快枪手模式
    // 对决模式（猜颜色）
    dm: room.duelMode || false,              // 对决模式
    ttl: room.turnTimeLimit || 0,            // 每轮时间限制
    // p1 永远是房主，p2 永远是被邀请者
    p1: hostPlayer.name || '神秘玩家',
    p2: guestPlayer.name || '神秘玩家',
    p1a: hostPlayer.avatar || '',
    p2a: guestPlayer.avatar || '',
    // 调试日志
    _debug: {
      hostAvatar: hostPlayer.avatar,
      guestAvatar: guestPlayer.avatar,
      myRole: myRole
    },
    w: winnerRole || '',  // 获胜者角色：'host' 或 'guest'，null表示平局
    mr: myRole || '',     // 当前用户角色：'host' 或 'guest'
    iw: isWin,            // 当前用户是否获胜（平局时为false）
    rs: reason || '',
    gc: history.length || 0,
    mgc: myGuessCount || 0,
    ogc: opponentGuessCount || 0,
    ms: mySecret,
    os: opponentSecret,
    h: (history && history.join(',')) || '',
    ct: room.createTime || now,
    d: duration || 0,
    rid: String(room._id || ''),
    ooid: myRole === 'host' ? guestPlayer.openid : hostPlayer.openid  // 对手的 openid
  }

  // 再次检查所有字段，确保没有 undefined
  for (const key in record) {
    if (record[key] === undefined) {
      record[key] = ''
    }
  }

  return record
}

// ================= 主线业务逻辑 =================

async function createRoom(data, openid) {
  const { 
    gameType = 'number',      // 游戏类型：number/color
    digitCount = 4,           // 位数（猜数字用）
    digitRule = 'repeat',     // 数字规则（猜数字用）
    colorMode = 'repeat',     // 颜色模式（猜颜色用）
    firstPlayer = 'host',     // 先手玩家（猜颜色用）
    timeLimit = 10,           // 时间限制（分钟）
    quickDrawMode = false,    // 快枪手模式（猜数字用）
    duelMode = false,         // 对决模式（猜颜色用）
    turnTimeLimit = 30,       // 每轮时间限制（对决模式用）
    userInfo 
  } = data

  // 核心改造 1：生成 6 位表面房号，交由 _id 生成标准 UUID
  const roomNumber = String(Math.floor(100000 + Math.random() * 900000))
  
  // 根据游戏类型确定初始状态
  let colorSecret = null
  let initialStatus = 'waiting'
  let initialGuesser = 'host'
  
  if (gameType === 'color') {
    // 猜颜色：系统生成密码，不需要设置密码阶段
    colorSecret = generateColorSecret(colorMode)
    initialStatus = 'waiting'  // 等待客人加入
    initialGuesser = firstPlayer  // 根据设置决定先手
  }

  const roomRes = await db.collection('rooms').add({
    data: {
      roomNumber, // 新增外显房号字段
      status: initialStatus, 
      gameType,           // 游戏类型
      // 猜数字字段
      digitCount, 
      digitRule, 
      quickDrawMode,
      // 猜颜色字段
      colorMode,          // 颜色模式
      colorSecret,        // 系统生成的颜色密码
      firstPlayer,        // 先手玩家
      // 时间限制
      timeLimit,          // 房间总时间限制（分钟）
      // 对决模式字段
      duelMode,           // 对决模式开关
      turnTimeLimit: duelMode ? turnTimeLimit : 0,  // 每轮时间限制
      // 猜颜色回合统计
      hostGuesses: 0,     // 房主已猜次数
      guestGuesses: 0,    // 客人已猜次数
      maxGuessesPerPlayer: 4,  // 每人最大次数
      // 玩家信息
      players: { 
        host: { 
          openid, 
          name: userInfo?.name, 
          avatar: userInfo?.avatar, 
          isOnline: true, 
          isReady: gameType === 'color'  // 猜颜色时房主直接准备
        }, 
        guest: null 
      },
      currentTurn: firstPlayer, 
      currentGuesser: initialGuesser, 
      history: [], 
      winner: null,
      expireAt: new Date(Date.now() + 5 * 60 * 1000), 
      updateTime: db.serverDate(), 
      createTime: db.serverDate() // waiting状态5分钟过期
    }
  })
  const roomId = roomRes._id // 拿到真实的系统生成 UUID

  // 猜数字需要创建密码表，猜颜色不需要（系统出题）
  if (gameType === 'number') {
    await db.collection('room_secrets').add({
      data: { _id: roomId, hostSecret: '', guestSecret: '', createTime: db.serverDate() }
    })
  } else {
    // 猜颜色也创建一个空记录，保持兼容性
    await db.collection('room_secrets').add({
      data: { _id: roomId, hostSecret: '', guestSecret: '', createTime: db.serverDate() }
    })
  }

  // 将 openid 返回给前端缓存，确保身份识别准确
  return { 
    success: true, 
    roomId, 
    roomNumber, 
    openid,
    gameType,
    colorSecret: gameType === 'color' ? colorSecret : null  // 仅猜颜色返回密码（调试用）
  }
}

async function joinRoom(data, openid) {
  let { roomNumber, roomId: inputRoomId, userInfo } = data

  // 兼容处理：如果传的是 roomId（旧逻辑）或 roomNumber（新逻辑）
  let cleanRoomNumber = String(roomNumber || inputRoomId).replace('ROOM_', '').trim()

  let room, roomId

  // 判断传入的是 UUID（24位十六进制）还是 6 位房号
  // 注意：云开发数据库的 _id 可能是 24 位十六进制字符串（ObjectId）或其他格式
  const isUUID = /^[a-f0-9]{24}$/i.test(cleanRoomNumber) || cleanRoomNumber.length > 10

  if (isUUID) {
    // 直接通过 _id 查询（再来一局场景）
    console.log('[joinRoom] 通过 _id 查询房间:', cleanRoomNumber)
    const roomRes = await db.collection('rooms').doc(cleanRoomNumber).get().catch((err) => {
      console.error('[joinRoom] 查询房间失败:', err)
      return null
    })
    console.log('[joinRoom] 查询结果:', roomRes)
    if (!roomRes || !roomRes.data) {
      return { success: false, error: '房间不存在或已结束' }
    }
    room = roomRes.data
    roomId = cleanRoomNumber  // 使用传入的 ID

    // 检查房间状态
    if (!['waiting', 'setting', 'playing'].includes(room.status)) {
      return { success: false, error: '房间不存在或已结束' }
    }
  } else {
    // 通过 6 位房号寻找真实 UUID（支持 waiting、setting、playing 状态）
    console.log('[joinRoom] 通过 roomNumber 查询房间:', cleanRoomNumber)
    const queryRes = await db.collection('rooms').where({
      roomNumber: cleanRoomNumber,
      status: _.in(['waiting', 'setting', 'playing'])
    }).orderBy('createTime', 'desc').limit(1).get()

    if (!queryRes.data || queryRes.data.length === 0) return { success: false, error: '房间不存在或已结束' }
    room = queryRes.data[0]
    roomId = room._id // 获取到底层 UUID
  }

  // 检查是否是原玩家重连（通过 openid 匹配）
  // 注意：再来一局场景（通过 UUID 查询），房主不需要重连逻辑，直接返回房间信息
  if (room.players.host && room.players.host.openid === openid) {
    // 【修复 P0 漏洞一】再来一局场景：只要是发起方（房主），不管房间状态是 waiting 还是 setting，都直接放行
    // 因为 B 可能比 A 快，房间状态已经被 B 加入改成了 setting
    if (isUUID) {
      console.log('[joinRoom] 再来一局房主进入房间:', openid)
      return { success: true, roomId, openid, room }
    }
    // 房主重连
    await db.collection('rooms').doc(roomId).update({
      data: { 'players.host.isOnline': true, updateTime: db.serverDate() }
    })
    const updatedRoom = (await db.collection('rooms').doc(roomId).get()).data
    return { success: true, message: '重连成功', roomId, openid, room: updatedRoom }
  }

  if (room.players.guest && room.players.guest.openid === openid) {
    // 如果是再来一局场景（通过 UUID 查询），直接返回成功（客人已经在房间里了）
    if (isUUID) {
      console.log('[joinRoom] 再来一局客人已在房间:', openid)
      return { success: true, roomId, openid, room }
    }
    // 客人重连
    await db.collection('rooms').doc(roomId).update({
      data: { 'players.guest.isOnline': true, updateTime: db.serverDate() }
    })
    const updatedRoom = (await db.collection('rooms').doc(roomId).get()).data
    return { success: true, message: '重连成功', roomId, openid, room: updatedRoom }
  }

  // 检查是否有人离线（setting 或 playing 状态）
  if (room.status === 'setting' || room.status === 'playing') {
    const hostOffline = room.players.host && room.players.host.isOnline === false
    const guestOffline = room.players.guest && room.players.guest.isOnline === false

    if (hostOffline || guestOffline) {
      // 有人离线，拒绝新玩家加入
      return { success: false, error: '房间玩家暂时离开，请稍后再试' }
    }

    // 房间已满且都在线
    return { success: false, error: '房间已满' }
  }

  // waiting 状态：检查是否是"僵尸房间"（房主离线超过1分钟）
  if (room.status === 'waiting') {
    const hostOffline = room.players.host && room.players.host.isOnline === false
    if (hostOffline) {
      // 房主离线，检查离线时间
      const updateTime = room.updateTime ? new Date(room.updateTime).getTime() : Date.now()
      const offlineTime = Date.now() - updateTime
      if (offlineTime > 60 * 1000) {
        // 离线超过1分钟，删除房间并拒绝加入
        await db.collection('rooms').doc(roomId).remove()
        try { await db.collection('room_secrets').doc(roomId).remove() } catch(e) {}
        return { success: false, error: '房间已过期，请创建新房间' }
      }
    }
  }

  // waiting 状态，正常加入逻辑
  if (room.players.guest !== null) return { success: false, error: '房间已满' }

  // 猜颜色游戏，客人直接准备
  const isColorGame = room.gameType === 'color'

  const res = await db.collection('rooms').where({
    _id: roomId, status: 'waiting', 'players.guest': _.eq(null)
  }).update({
    data: {
      'players.guest': _.set({ 
        openid, 
        name: userInfo?.name, 
        avatar: userInfo?.avatar, 
        isOnline: true, 
        isReady: isColorGame  // 猜颜色时客人直接准备
      }),
      status: isColorGame ? 'playing' : 'setting',  // 猜颜色直接进入游戏
      updateTime: db.serverDate(), 
      expireAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  })

  if (res.stats.updated > 0) {
    // 加入成功，返回完整房间信息（包含房主头像）
    const updatedRoom = (await db.collection('rooms').doc(roomId).get()).data
    return { success: true, roomId, openid, room: updatedRoom }
  }
  return { success: false, error: '房间已满或失效' }
}

async function setSecret(data, openid) {
  const { roomId, secret } = data
  const room = (await db.collection('rooms').doc(roomId).get()).data
  const isHost = room.players.host.openid === openid
  const playerKey = isHost ? 'host' : 'guest'
  const opponentRole = isHost ? 'guest' : 'host'

  await db.collection('room_secrets').doc(roomId).update({
    data: { [playerKey + 'Secret']: secret, [playerKey + 'SecretSetAt']: db.serverDate() }
  })

  const isOpponentReady = room.players[opponentRole]?.isReady
  const newStatus = isOpponentReady ? 'playing' : 'setting'

  await db.collection('rooms').doc(roomId).update({
    data: {
      [`players.${playerKey}.isReady`]: true, status: newStatus,
      updateTime: db.serverDate(), expireAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
    }
  })
  return { success: true }
}

async function submitGuess(data, openid) {
  const { roomId, guess } = data
  const room = (await db.collection('rooms').doc(roomId).get()).data
  if (room.status !== 'playing') return { success: false, error: '不在游戏中' }

  const myRole = room.players.host.openid === openid ? 'host' : 'guest'
  const opponentRole = myRole === 'host' ? 'guest' : 'host'
  if (room.currentGuesser !== myRole) return { success: false, error: '未到你的回合' }

  const secrets = (await db.collection('room_secrets').doc(roomId).get()).data || {}
  const opponentSecret = secrets[opponentRole + 'Secret']

  const { a, b } = calculateAB(String(guess), String(opponentSecret))
  const isWin = (a === Number(room.digitCount))

  // 统一历史记录格式: "host:guess=1234:result=1A2B"
  const historyEntry = `${myRole}:guess=${guess}:result=${a}A${b}B`

  const updateData = {
    history: _.push(historyEntry),
    currentGuesser: opponentRole,
    status: isWin ? 'finished' : 'playing',
    updateTime: db.serverDate(),
    expireAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
  }

  // 快枪手模式：记录新一轮开始时间
  if (!isWin && room.quickDrawMode) {
    updateData.turnStartTime = db.serverDate()
  }

  if (isWin) {
    updateData.winner = myRole
    updateData.reason = 'normal'
    updateData.revealSecrets = { host: secrets.hostSecret, guest: secrets.guestSecret }
  }

  // 更新数据库
  await db.collection('rooms').doc(roomId).update({ data: updateData })

  // 如果获胜，保存战绩
  if (isWin) {
    try {
      // 构建完整的房间数据用于战绩保存
      const finalRoom = {
        ...room,
        history: [...(room.history || []), historyEntry],
        winner: myRole,
        reason: 'normal'
      }
      await saveBattleRecord(roomId, finalRoom, secrets, myRole, 'normal')
    } catch (e) {
    }
  }

  // 返回统一的格式，包含猜测结果
  return {
    code: 0,
    data: {
      a: a,
      b: b,
      finished: isWin,
      room: isWin ? { ...room, ...updateData, history: [...(room.history || []), historyEntry] } : null
    }
  }
}

// 提交颜色猜测（猜颜色用）
async function submitColorGuess(data, openid) {
  const { roomId, guessColors } = data  // guessColors: ['red','blue','green','yellow']
  
  const roomRes = await db.collection('rooms').doc(roomId).get()
  if (!roomRes.data) return { success: false, error: '房间不存在' }
  
  const room = roomRes.data
  
  if (room.status !== 'playing') return { success: false, error: '不在游戏中' }
  if (room.gameType !== 'color') return { success: false, error: '不是猜颜色游戏' }

  const myRole = room.players.host.openid === openid ? 'host' : 'guest'
  const opponentRole = myRole === 'host' ? 'guest' : 'host'
  
  if (room.currentGuesser !== myRole) return { success: false, error: '未到你的回合' }
  
  // 检查次数限制
  const myGuessCount = myRole === 'host' ? (room.hostGuesses || 0) : (room.guestGuesses || 0)
  if (myGuessCount >= 4) {
    return { success: false, error: '次数已用完' }
  }
  
  // 计算提示
  const { red, white } = calculateColorHints(guessColors, room.colorSecret)
  const isWin = (red === 4)
  
  // 更新猜测次数
  const guessCountField = myRole === 'host' ? 'hostGuesses' : 'guestGuesses'
  
  // 构建历史记录格式: "host:guess=red,blue,green,yellow:result=2R1W"
  const guessStr = guessColors.join(',')
  const historyEntry = `${myRole}:guess=${guessStr}:result=${red}R${white}W`
  
  // 先检查游戏结束条件（需要在 updateData 之前定义 gameFinished）
  let gameFinished = false
  let winner = null
  let reason = ''

  if (isWin) {
    // 当前玩家猜中，获胜
    gameFinished = true
    winner = myRole
    reason = 'guess_correct'
  } else {
    // 检查是否双方都用完次数
    const myNewCount = myGuessCount + 1
    const opponentCount = opponentRole === 'host' ? (room.hostGuesses || 0) : (room.guestGuesses || 0)

    if (myNewCount >= 4 && opponentCount >= 4) {
      // 双方都用完4次，平局
      gameFinished = true
      winner = null  // 平局
      reason = 'out_of_guesses'
    }
  }

  const updateData = {
    [guessCountField]: _.inc(1),
    history: _.push(historyEntry),
    currentGuesser: opponentRole,
    updateTime: db.serverDate(),
    expireAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
  }

  // 对决模式：记录新一轮开始时间
  if (!gameFinished && room.duelMode) {
    updateData.turnStartTime = db.serverDate()
  }

  if (gameFinished) {
    updateData.status = 'finished'
    updateData.winner = winner
    updateData.reason = reason
    updateData.revealSecret = room.colorSecret  // 揭晓答案
  }
  
  await db.collection('rooms').doc(roomId).update({ data: updateData })
  
  // 如果游戏结束，保存战绩
  if (gameFinished) {
    try {
      const finalRoom = {
        ...room,
        ...updateData,
        history: [...(room.history || []), historyEntry]
      }
      await saveBattleRecord(roomId, finalRoom, null, winner, reason)
    } catch (e) {
    }
  }
  
  return {
    code: 0,
    success: true,
    data: {
      red,
      white,
      isWin,
      finished: gameFinished,
      myRemainingGuesses: 4 - (myGuessCount + 1)
    }
  }
}

async function heartbeat(data, openid) {
  await db.collection('rooms').doc(data.roomId).update({
    data: { expireAt: new Date(Date.now() + 2 * 60 * 60 * 1000), updateTime: db.serverDate() }
  })
  return { success: true }
}

async function reconnect(data, openid) {
  const { roomId } = data
  const roomRes = await db.collection('rooms').doc(roomId).get().catch(() => null)
  if (!roomRes) return { success: false, error: '房间不存在' }

  const room = roomRes.data

  // 检查是否是房间成员
  const isHost = room.players.host && room.players.host.openid === openid
  const isGuest = room.players.guest && room.players.guest.openid === openid

  if (!isHost && !isGuest) {
    return { success: false, error: '不是房间成员' }
  }

  const myRole = isHost ? 'host' : 'guest'

  // 检查离线时间是否超过 60 秒
  const offlineAt = room.players[myRole].offlineAt
  if (offlineAt) {
    const offlineTime = Date.now() - new Date(offlineAt).getTime()
    if (offlineTime > 60000) {
      // 超过 60 秒，房间已结束
      return { success: false, error: '离开时间超过 60 秒，房间已结束' }
    }
  }

  // 恢复在线状态
  await db.collection('rooms').doc(roomId).update({
    data: {
      [`players.${myRole}.isOnline`]: true,
      [`players.${myRole}.offlineAt`]: null,
      updateTime: db.serverDate()
    }
  })

  // 返回最新房间信息
  const updatedRoom = (await db.collection('rooms').doc(roomId).get()).data
  return { success: true, room: updatedRoom, myRole }
}

async function getRoomStatus(data, openid) {
  const { roomId } = data
  if (!roomId) return { success: false, error: '房间ID不能为空' }

  const roomRes = await db.collection('rooms').doc(roomId).get().catch(() => null)
  if (!roomRes) {
    // 房间不存在，可能已结束被清理
    return { success: true, status: 'not_found', message: '房间不存在或已结束' }
  }

  const room = roomRes.data

  // 检查是否是房间成员
  const isHost = room.players.host && room.players.host.openid === openid
  const isGuest = room.players.guest && room.players.guest.openid === openid

  if (!isHost && !isGuest) {
    return { success: false, error: '不是房间成员' }
  }

  return {
    success: true,
    status: room.status,
    roomId: roomId,
    isHost: isHost,
    gameType: room.gameType,  // 返回游戏类型
    message: room.status === 'finished' ? '房间已结束' : '房间进行中'
  }
}

async function leaveRoom(data, openid) {
  const roomRes = await db.collection('rooms').doc(data.roomId).get().catch(()=>null)
  if (!roomRes) return { success: true }
  const room = roomRes.data

  if (room.status === 'playing' || room.status === 'setting') {
    const myRole = room.players.host.openid === openid ? 'host' : 'guest'

    // 标记玩家为离线状态，记录离线时间
    await db.collection('rooms').doc(data.roomId).update({
      data: {
        [`players.${myRole}.isOnline`]: false,
        [`players.${myRole}.offlineAt`]: db.serverDate()
      }
    })

    // 不立即结束房间，给玩家60秒时间返回
    // 60秒后由前端或心跳检测来真正结束房间

  } else if (room.status === 'waiting') {
    // 只有房主可以删除waiting状态的房间
    if (room.players.host && room.players.host.openid === openid) {
      await db.collection('rooms').doc(data.roomId).remove()
      try { await db.collection('room_secrets').doc(data.roomId).remove() } catch(e) {}
    }
  }
  return { success: true }
}

async function finishRoom(data, openid) {
  const { roomId, winner, reason } = data

  const roomRes = await db.collection('rooms').doc(roomId).get().catch(() => null)
  if (!roomRes) return { success: false, error: '房间不存在' }

  const room = roomRes.data

  // 检查是否是房间成员
  const isHost = room.players.host && room.players.host.openid === openid
  const isGuest = room.players.guest && room.players.guest.openid === openid

  if (!isHost && !isGuest) {
    return { success: false, error: '不是房间成员' }
  }

  // 更新房间状态为 finished
  await db.collection('rooms').doc(roomId).update({
    data: {
      status: 'finished',
      winner: winner,
      reason: reason,
      updateTime: db.serverDate()
    }
  })

  // 双方都离线超时，不计入战绩
  if (reason === 'both_offline_timeout') {
    return { success: true, message: '房间已结束（不计入战绩）' }
  }

  // 快枪手模式超时或对决模式超时，保存战绩
  if (reason === 'quick_draw_timeout' || reason === 'duel_timeout') {
    try {
      // 获取密码
      const secretsRes = await db.collection('room_secrets').doc(roomId).get().catch(() => null)
      const secrets = secretsRes ? secretsRes.data : {}

      // 更新后的房间数据
      const updatedRoom = {
        ...room,
        status: 'finished',
        winner: winner,
        reason: reason
      }

      await saveBattleRecord(roomId, updatedRoom, secrets, winner, reason)
    } catch (e) {
    }
  }

  return { success: true, message: '房间已结束' }
}

/**
 * 设置游戏结束时间
 */
async function setGameEndTime(data, openid) {
  const { roomId, gameEndTime } = data

  const roomRes = await db.collection('rooms').doc(roomId).get().catch(() => null)
  if (!roomRes) return { success: false, error: '房间不存在' }

  const room = roomRes.data

  // 只有房主可以设置结束时间
  if (room.players.host.openid !== openid) {
    return { success: false, error: '只有房主可以设置结束时间' }
  }

  await db.collection('rooms').doc(roomId).update({
    data: {
      gameEndTime: gameEndTime,
      updateTime: db.serverDate()
    }
  })

  return { success: true }
}

/**
 * 时间到自动结束游戏
 */
async function finishByTimeout(data, openid) {
  const { roomId } = data

  const roomRes = await db.collection('rooms').doc(roomId).get().catch(() => null)
  if (!roomRes) return { success: false, error: '房间不存在' }

  const room = roomRes.data

  // 检查是否已经在 finished 状态
  if (room.status === 'finished') {
    return { success: true, message: '房间已结束' }
  }

  // 获取密码
  const secretsRes = await db.collection('room_secrets').doc(roomId).get().catch(() => null)
  const secrets = secretsRes ? secretsRes.data : {}

  // 更新房间状态为 finished，无获胜者
  await db.collection('rooms').doc(roomId).update({
    data: {
      status: 'finished',
      winner: null,
      reason: 'timeout',
      updateTime: db.serverDate()
    }
  })

  // 保存战绩（双方都是败）
  try {
    const now = Date.now()
    const hostRecord = buildRecord(room, secrets, 'host', null, 'timeout', 0, now)
    const guestRecord = buildRecord(room, secrets, 'guest', null, 'timeout', 0, now)

    // 清洗数据，确保没有 undefined
    const cleanHostRecord = {}
    const cleanGuestRecord = {}
    
    for (const key in hostRecord) {
      cleanHostRecord[key] = hostRecord[key] === undefined ? '' : hostRecord[key]
    }
    for (const key in guestRecord) {
      cleanGuestRecord[key] = guestRecord[key] === undefined ? '' : guestRecord[key]
    }

    await db.collection('records').add({ data: cleanHostRecord })
    await db.collection('records').add({ data: cleanGuestRecord })

  } catch (err) {
  }

  return { success: true, message: '时间到，游戏结束' }
}

// ================= 再来一局相关函数 =================

/**
 * 再来一局：创建新房间并建立链式关系
 * @param {Object} data - 请求参数
 * @param {string} data.roomId - 老房间ID
 * @param {Object} openid - 用户openid
 */
async function rematch(data, openid) {
  const { roomId: oldRoomId } = data

  // 1. 查询老房间信息
  const oldRoomRes = await db.collection('rooms').doc(oldRoomId).get().catch(() => null)
  if (!oldRoomRes) {
    return { success: false, error: '房间不存在' }
  }

  const oldRoom = oldRoomRes.data

  // 2. 检查是否是房间成员
  const isHost = oldRoom.players.host && oldRoom.players.host.openid === openid
  const isGuest = oldRoom.players.guest && oldRoom.players.guest.openid === openid

  if (!isHost && !isGuest) {
    return { success: false, error: '不是房间成员' }
  }

  const myRole = isHost ? 'host' : 'guest'
  const opponentRole = isHost ? 'guest' : 'host'

  // 3. 检查是否已经有 nextRoomId（并发控制，以老房间为锁）
  if (oldRoom.nextRoomId) {
    // 【修复 P0 漏洞二】对方抢先一步，我不仅要直接加入，还要顺手解开对方的等待锁！
    // 否则 A 会一直卡在 pending 状态，16秒后超时销毁房间
    await db.collection('rooms').doc(oldRoomId).update({
      data: {
        rematchStatus: 'accepted',
        updateTime: db.serverDate()
      }
    })

    return {
      success: true,
      message: '对方已创建房间',
      nextRoomId: oldRoom.nextRoomId,
      rematchStatus: 'accepted',
      isJoinMode: true  // 标记为加入模式
    }
  }

  // 4. 检查 rematchStatus 是否已经是 pending 或更高状态
  if (oldRoom.rematchStatus && oldRoom.rematchStatus !== 'none') {
    return { success: false, error: '再来一局邀请已存在或已结束' }
  }

  // 5. 创建新房间，复制老房间的设置
  const roomNumber = String(Math.floor(100000 + Math.random() * 900000))

  // 根据游戏类型确定初始状态
  let colorSecret = null
  let initialStatus = 'waiting'
  let initialGuesser = 'host'

  if (oldRoom.gameType === 'color') {
    colorSecret = generateColorSecret(oldRoom.colorMode || 'repeat')
    initialStatus = 'waiting'
    initialGuesser = oldRoom.firstPlayer || 'host'
  }

  // 创建新房间，发起者作为房主
  const newRoomRes = await db.collection('rooms').add({
    data: {
      roomNumber,
      status: initialStatus,
      gameType: oldRoom.gameType || 'number',
      // 复制老房间的设置
      digitCount: oldRoom.digitCount || 4,
      digitRule: oldRoom.digitRule || 'repeat',
      quickDrawMode: oldRoom.quickDrawMode || false,
      colorMode: oldRoom.colorMode || 'repeat',
      colorSecret,
      firstPlayer: oldRoom.firstPlayer || 'host',
      timeLimit: oldRoom.timeLimit || 10,
      duelMode: oldRoom.duelMode || false,
      turnTimeLimit: oldRoom.turnTimeLimit || 30,
      // 猜颜色回合统计
      hostGuesses: 0,
      guestGuesses: 0,
      maxGuessesPerPlayer: 4,
      // 玩家信息：发起者作为房主
      players: {
        host: {
          openid,
          name: oldRoom.players[myRole].name || '神秘玩家',
          avatar: oldRoom.players[myRole].avatar || '',
          isOnline: true,
          isReady: oldRoom.gameType === 'color'
        },
        guest: null
      },
      currentTurn: oldRoom.firstPlayer || 'host',
      currentGuesser: initialGuesser,
      history: [],
      winner: null,
      expireAt: new Date(Date.now() + 2 * 60 * 1000), // 2分钟过期（等待对方加入）
      updateTime: db.serverDate(),
      createTime: db.serverDate()
    }
  })

  const newRoomId = newRoomRes._id

  // 6. 创建密码表
  await db.collection('room_secrets').add({
    data: { _id: newRoomId, hostSecret: '', guestSecret: '', createTime: db.serverDate() }
  })

  // 7. 原子性地更新老房间，建立链式关系
  await db.collection('rooms').doc(oldRoomId).update({
    data: {
      nextRoomId: newRoomId,
      rematchInitiator: openid,
      rematchStatus: 'pending',
      updateTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '再来一局邀请已发送',
    nextRoomId: newRoomId,
    roomNumber,
    rematchStatus: 'pending'
  }
}

/**
 * 接受再来一局邀请
 * @param {Object} data - 请求参数
 * @param {string} data.roomId - 老房间ID
 * @param {Object} openid - 用户openid
 */
async function acceptRematch(data, openid) {
  const { roomId: oldRoomId } = data

  // 1. 查询老房间信息
  const oldRoomRes = await db.collection('rooms').doc(oldRoomId).get().catch(() => null)
  if (!oldRoomRes) {
    return { success: false, error: '房间不存在' }
  }

  const oldRoom = oldRoomRes.data

  // 2. 检查是否是房间成员
  const isHost = oldRoom.players.host && oldRoom.players.host.openid === openid
  const isGuest = oldRoom.players.guest && oldRoom.players.guest.openid === openid

  if (!isHost && !isGuest) {
    return { success: false, error: '不是房间成员' }
  }

  // 3. 检查 rematchStatus 是否为 pending
  if (oldRoom.rematchStatus !== 'pending') {
    if (oldRoom.rematchStatus === 'cancelled') {
      return { success: false, error: '邀请已取消' }
    }
    if (oldRoom.rematchStatus === 'expired') {
      return { success: false, error: '邀请已过期' }
    }
    if (oldRoom.rematchStatus === 'rejected') {
      return { success: false, error: '邀请已被拒绝' }
    }
    return { success: false, error: '邀请状态异常' }
  }

  // 4. 检查 nextRoomId 是否存在
  if (!oldRoom.nextRoomId) {
    return { success: false, error: '新房间不存在' }
  }

  // 5. 检查发起方是否还在新房间中
  const newRoomRes = await db.collection('rooms').doc(oldRoom.nextRoomId).get().catch(() => null)
  if (!newRoomRes) {
    return { success: false, error: '新房间已失效' }
  }

  const newRoom = newRoomRes.data

  // 检查发起方（新房主）是否在线
  if (!newRoom.players.host || newRoom.players.host.isOnline === false) {
    return { success: false, error: '发起方已离开房间' }
  }

  // 6. 原子性地更新老房间状态为 accepted
  await db.collection('rooms').doc(oldRoomId).update({
    data: {
      rematchStatus: 'accepted',
      updateTime: db.serverDate()
    }
  })

  return {
    success: true,
    message: '接受邀请成功',
    nextRoomId: oldRoom.nextRoomId,
    roomNumber: newRoom.roomNumber
  }
}

/**
 * 取消再来一局邀请（发起方调用）
 * @param {Object} data - 请求参数
 * @param {string} data.roomId - 老房间ID
 * @param {Object} openid - 用户openid
 */
async function cancelRematch(data, openid) {
  const { roomId: oldRoomId } = data

  // 1. 查询老房间信息
  const oldRoomRes = await db.collection('rooms').doc(oldRoomId).get().catch(() => null)
  if (!oldRoomRes) {
    return { success: false, error: '房间不存在' }
  }

  const oldRoom = oldRoomRes.data

  // 2. 检查是否是发起方
  if (oldRoom.rematchInitiator !== openid) {
    return { success: false, error: '只有发起方可以取消邀请' }
  }

  // 3. 检查 rematchStatus 是否为 pending
  if (oldRoom.rematchStatus !== 'pending') {
    return { success: false, error: '邀请状态不允许取消' }
  }

  // 4. 更新老房间状态为 cancelled
  await db.collection('rooms').doc(oldRoomId).update({
    data: {
      rematchStatus: 'cancelled',
      updateTime: db.serverDate()
    }
  })

  // 5. 删除新房间（可选，如果新房间还没有人加入）
  if (oldRoom.nextRoomId) {
    const newRoomRes = await db.collection('rooms').doc(oldRoom.nextRoomId).get().catch(() => null)
    if (newRoomRes) {
      const newRoom = newRoomRes.data
      // 只有新房间还是 waiting 状态且没有客人加入时才删除
      if (newRoom.status === 'waiting' && !newRoom.players.guest) {
        await db.collection('rooms').doc(oldRoom.nextRoomId).remove()
        try { await db.collection('room_secrets').doc(oldRoom.nextRoomId).remove() } catch(e) {}
      }
    }
  }

  return { success: true, message: '邀请已取消' }
}

/**
 * 再来一局邀请超时（发起方调用）
 * @param {Object} data - 请求参数
 * @param {string} data.roomId - 老房间ID
 * @param {Object} openid - 用户openid
 */
async function expireRematch(data, openid) {
  const { roomId: oldRoomId } = data

  // 1. 查询老房间信息
  const oldRoomRes = await db.collection('rooms').doc(oldRoomId).get().catch(() => null)
  if (!oldRoomRes) {
    return { success: false, error: '房间不存在' }
  }

  const oldRoom = oldRoomRes.data

  // 2. 检查 rematchStatus 是否为 pending
  if (oldRoom.rematchStatus !== 'pending') {
    return { success: false, error: '邀请状态不是 pending' }
  }

  // 3. 更新老房间状态为 expired
  await db.collection('rooms').doc(oldRoomId).update({
    data: {
      rematchStatus: 'expired',
      updateTime: db.serverDate()
    }
  })

  // 4. 删除新房间（如果新房间还没有人加入）
  if (oldRoom.nextRoomId) {
    const newRoomRes = await db.collection('rooms').doc(oldRoom.nextRoomId).get().catch(() => null)
    if (newRoomRes) {
      const newRoom = newRoomRes.data
      // 只有新房间还是 waiting 状态且没有客人加入时才删除
      if (newRoom.status === 'waiting' && !newRoom.players.guest) {
        await db.collection('rooms').doc(oldRoom.nextRoomId).remove()
        try { await db.collection('room_secrets').doc(oldRoom.nextRoomId).remove() } catch(e) {}
      }
    }
  }

  return { success: true, message: '邀请已过期' }
}
