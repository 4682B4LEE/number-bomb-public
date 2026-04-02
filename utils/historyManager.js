/**
 * ============================================================================
 * 双人猜数对决 - 本地对战记录管理工具
 * ============================================================================
 *
 * 【文件说明】
 * 本模块提供本地游戏记录的存储和管理功能，包括：
 * 1. 添加、更新、删除本地对战记录
 * 2. 收藏/取消收藏本地记录
 * 3. 记录排序和分页
 * 4. 联机对战收藏管理
 *
 * 【存储说明】
 * - 使用微信小程序本地存储 (wx.getStorageSync)
 * - 本地记录最大保存 50 条
 * - 收藏记录最多 3 条（本地和联机各 3 条）
 *
 * 【使用方法】
 * const history = require('../../utils/historyManager.js')
 * history.addRecord({...})           // 添加记录
 * history.toggleFavorite(id, true)   // 收藏记录
 * const records = history.getRecords() // 获取所有记录
 * ============================================================================
 */

// 本地存储键名
const HISTORY_KEY = 'LOCAL_GAME_HISTORY';           // 本地对战记录
const ONLINE_FAVORITES_KEY = 'ONLINE_FAVORITES';    // 联机对战收藏

// 数量限制常量
const MAX_LIMIT = 50;               // 单机模式最大保存条数
const MAX_ONLINE_FAVORITES = 3;     // 联机对战最多收藏条数
const MAX_LOCAL_FAVORITES = 3;      // 本地模式最多置顶条数

/**
 * 本地对战记录管理器
 */
const HistoryManager = {
  /**
   * 添加一条新对战记录（单机模式）
   * @param {Object} record - 游戏记录对象
   * @returns {string} 记录ID
   */
  addRecord(record) {
    try {
      // 1. 获取历史记录，如果没有则为空数组
      let historyList = wx.getStorageSync(HISTORY_KEY) || [];

      // 2. 补充记录的通用字段
      const newRecord = {
        id: Date.now().toString() + Math.floor(Math.random() * 1000),
        createTime: new Date().getTime(),
        isFavorite: false, // 是否收藏
        ...record
      };

      // 3. 将新记录插入到数组头部（最新的在前）
      historyList.unshift(newRecord);

      // 4. 容量限制：超过 MAX_LIMIT 条，则截掉尾部旧数据
      // 但保留被收藏的记录
      if (historyList.length > MAX_LIMIT) {
        // 分离收藏和非收藏记录
        const favorites = historyList.filter(item => item.isFavorite);
        const normals = historyList.filter(item => !item.isFavorite);

        // 只截断非收藏记录
        const keepNormals = normals.slice(0, MAX_LIMIT - favorites.length);
        historyList = [...favorites, ...keepNormals];
      }

      // 5. 保存回本地缓存
      wx.setStorageSync(HISTORY_KEY, historyList);
      console.log('本地记录保存成功，当前总条数：', historyList.length);

      return newRecord.id;
    } catch (e) {
      console.error('保存本地对战记录失败', e);
      return null;
    }
  },

  /**
   * 更新已有记录
   * @param {string} recordId - 记录ID
   * @param {Object} updateData - 更新的数据
   * @returns {boolean} 是否成功
   */
  updateRecord(recordId, updateData) {
    try {
      let historyList = wx.getStorageSync(HISTORY_KEY) || [];

      // 查找记录索引
      const index = historyList.findIndex(item => item.id === recordId);
      if (index === -1) {
        console.log('本地记录未找到:', recordId);
        return false;
      }

      // 更新记录
      historyList[index] = {
        ...historyList[index],
        ...updateData,
        id: recordId // 保持ID不变
      };

      // 保存回本地
      wx.setStorageSync(HISTORY_KEY, historyList);
      console.log('本地记录更新成功:', recordId);
      return true;
    } catch (e) {
      console.error('更新本地对战记录失败', e);
      return false;
    }
  },

  /**
   * 收藏/取消收藏本地记录
   * @param {string} recordId - 记录ID
   * @param {boolean} isFavorite - 是否收藏
   * @returns {boolean} 是否成功
   */
  toggleFavorite(recordId, isFavorite) {
    try {
      let historyList = wx.getStorageSync(HISTORY_KEY) || [];

      // 查找记录
      const index = historyList.findIndex(item => item.id === recordId);
      if (index === -1) {
        console.log('本地记录未找到:', recordId);
        return false;
      }

      if (isFavorite) {
        // 检查是否已达到最大收藏数
        const favoriteCount = historyList.filter(item => item.isFavorite).length;
        if (favoriteCount >= MAX_LOCAL_FAVORITES && !historyList[index].isFavorite) {
          wx.showToast({
            title: `最多置顶${MAX_LOCAL_FAVORITES}局`,
            icon: 'none'
          });
          return false;
        }
        // 记录收藏时间
        historyList[index].favoriteTime = Date.now();
      }

      // 更新收藏状态
      historyList[index].isFavorite = isFavorite;

      // 重新排序：收藏的记录置顶，按收藏时间排序
      this._sortRecords(historyList);

      // 保存回本地
      wx.setStorageSync(HISTORY_KEY, historyList);
      console.log(isFavorite ? '收藏成功:' : '取消收藏:', recordId);
      return true;
    } catch (e) {
      console.error('收藏操作失败', e);
      return false;
    }
  },

  /**
   * 删除记录
   * @param {string} recordId - 记录ID
   * @returns {boolean} 是否成功
   */
  deleteRecord(recordId) {
    try {
      let historyList = wx.getStorageSync(HISTORY_KEY) || [];

      // 查找记录索引
      const index = historyList.findIndex(item => item.id === recordId);
      if (index === -1) {
        console.log('本地记录未找到:', recordId);
        return false;
      }

      // 删除记录
      historyList.splice(index, 1);

      // 保存回本地
      wx.setStorageSync(HISTORY_KEY, historyList);
      console.log('本地记录删除成功:', recordId);
      return true;
    } catch (e) {
      console.error('删除本地记录失败', e);
      return false;
    }
  },

  /**
   * 收藏本地对战记录
   * @param {string} recordId - 记录ID
   * @returns {boolean} 是否成功
   */
  favoriteRecord(recordId) {
    return this.toggleFavorite(recordId, true);
  },

  /**
   * 取消收藏本地对战记录
   * @param {string} recordId - 记录ID
   * @returns {boolean} 是否成功
   */
  unfavoriteRecord(recordId) {
    return this.toggleFavorite(recordId, false);
  },

  /**
   * 获取所有收藏的记录ID列表
   * @returns {Array} 收藏的记录ID数组
   */
  getFavoriteIds() {
    try {
      const historyList = wx.getStorageSync(HISTORY_KEY) || [];
      return historyList
        .filter(item => item.isFavorite)
        .map(item => item.id);
    } catch (e) {
      console.error('获取收藏记录ID失败', e);
      return [];
    }
  },

  /**
   * 对记录进行排序：收藏的记录置顶
   * @param {Array} historyList - 记录列表
   * @private
   */
  _sortRecords(historyList) {
    // 分离收藏和非收藏记录
    const favorites = historyList.filter(item => item.isFavorite);
    const normals = historyList.filter(item => !item.isFavorite);

    // 收藏记录按收藏时间排序（后收藏的在前）
    favorites.sort((a, b) => (b.favoriteTime || 0) - (a.favoriteTime || 0));

    // 非收藏记录按创建时间排序（新的在前）
    normals.sort((a, b) => b.createTime - a.createTime);

    // 清空原数组并重新填充
    historyList.length = 0;
    historyList.push(...favorites, ...normals);
  },

  /**
   * 获取所有历史记录（已排序）
   * @returns {Array} 历史记录数组
   */
  getRecords() {
    try {
      let historyList = wx.getStorageSync(HISTORY_KEY) || [];
      // 确保记录已排序
      this._sortRecords(historyList);
      return historyList;
    } catch (e) {
      console.error('获取本地对战记录失败', e);
      return [];
    }
  },

  /**
   * 根据ID获取单条记录
   * @param {string} recordId - 记录ID
   * @returns {Object|null} 记录对象
   */
  getRecordById(recordId) {
    try {
      const historyList = wx.getStorageSync(HISTORY_KEY) || [];
      return historyList.find(item => item.id === recordId) || null;
    } catch (e) {
      console.error('获取本地单条记录失败', e);
      return null;
    }
  },

  /**
   * 清空所有历史记录
   */
  clearRecords() {
    try {
      wx.removeStorageSync(HISTORY_KEY);
      console.log('本地记录已清空');
    } catch (e) {
      console.error('清空本地记录失败', e);
    }
  },

  /**
   * 获取记录总数
   * @returns {number} 记录数量
   */
  getRecordCount() {
    try {
      const historyList = wx.getStorageSync(HISTORY_KEY) || [];
      return historyList.length;
    } catch (e) {
      console.error('获取本地记录数量失败', e);
      return 0;
    }
  },

  /**
   * 获取收藏记录数量
   * @returns {number} 收藏记录数量
   */
  getFavoriteCount() {
    try {
      const historyList = wx.getStorageSync(HISTORY_KEY) || [];
      return historyList.filter(item => item.isFavorite).length;
    } catch (e) {
      console.error('获取收藏记录数量失败', e);
      return 0;
    }
  },

  /**
   * 批量导入记录（用于数据迁移）
   * @param {Array} records - 要导入的记录数组
   * @returns {number} 成功导入的记录数
   */
  importRecords(records) {
    try {
      if (!Array.isArray(records) || records.length === 0) {
        return 0;
      }

      // 获取当前本地记录
      let historyList = wx.getStorageSync(HISTORY_KEY) || [];
      const currentCount = historyList.length;

      // 计算可导入的数量
      const availableSlots = MAX_LIMIT - currentCount;
      if (availableSlots <= 0) {
        console.log('本地记录已满，无法导入');
        return 0;
      }

      // 只导入可容纳的数量
      const recordsToImport = records.slice(0, availableSlots);

      // 为每条记录生成新的本地ID
      const importedRecords = recordsToImport.map(record => ({
        ...record,
        id: Date.now().toString() + Math.floor(Math.random() * 1000),
        isFavorite: false, // 导入的记录默认不收藏
        _isImported: true // 标记为导入的记录
      }));

      // 合并记录（新导入的放在后面）
      historyList = [...historyList, ...importedRecords];

      // 保存回本地
      wx.setStorageSync(HISTORY_KEY, historyList);
      console.log(`成功导入 ${importedRecords.length} 条记录，当前总条数：${historyList.length}`);

      return importedRecords.length;
    } catch (e) {
      console.error('批量导入记录失败', e);
      return 0;
    }
  },

  /**
   * 检查是否需要显示数据迁移弹窗
   * @returns {boolean} 是否需要显示
   */
  shouldShowMigrationDialog() {
    try {
      const hasMigrated = wx.getStorageSync('HAS_MIGRATED_DATA');
      return !hasMigrated;
    } catch (e) {
      return false;
    }
  },

  /**
   * 标记数据迁移已完成
   */
  markMigrationComplete() {
    try {
      wx.setStorageSync('HAS_MIGRATED_DATA', true);
      console.log('数据迁移标记完成');
    } catch (e) {
      console.error('标记数据迁移失败', e);
    }
  },

  // ==================== 联机对战收藏功能 ====================

  /**
   * 获取联机对战收藏列表
   * @returns {Array} 收藏的对局记录数组
   */
  getOnlineFavorites() {
    try {
      return wx.getStorageSync(ONLINE_FAVORITES_KEY) || [];
    } catch (e) {
      console.error('获取联机对战收藏失败', e);
      return [];
    }
  },

  /**
   * 收藏联机对战记录
   * @param {Object} record - 联机对战记录
   * @returns {boolean} 是否成功
   */
  addOnlineFavorite(record) {
    try {
      let favorites = wx.getStorageSync(ONLINE_FAVORITES_KEY) || [];

      // 检查是否已达到最大收藏数
      if (favorites.length >= MAX_ONLINE_FAVORITES) {
        wx.showToast({
          title: `最多收藏${MAX_ONLINE_FAVORITES}局联机对战`,
          icon: 'none'
        });
        return false;
      }

      // 检查是否已收藏
      const exists = favorites.some(item => item._id === record._id);
      if (exists) {
        wx.showToast({
          title: '该对局已收藏',
          icon: 'none'
        });
        return false;
      }

      // 添加收藏时间和本地ID
      const favoriteRecord = {
        ...record,
        localId: Date.now().toString() + Math.floor(Math.random() * 1000),
        favoriteTime: Date.now(),
        isFavorite: true,
        isOnlineFavorite: true // 标记为联机对战收藏
      };

      favorites.unshift(favoriteRecord);
      wx.setStorageSync(ONLINE_FAVORITES_KEY, favorites);
      console.log('联机对战收藏成功:', record._id);
      return true;
    } catch (e) {
      console.error('收藏联机对战失败', e);
      return false;
    }
  },

  /**
   * 取消收藏联机对战记录
   * @param {string} recordId - 记录ID（_id 或 localId）
   * @returns {boolean} 是否成功
   */
  removeOnlineFavorite(recordId) {
    try {
      let favorites = wx.getStorageSync(ONLINE_FAVORITES_KEY) || [];
      const index = favorites.findIndex(item =>
        item._id === recordId || item.localId === recordId
      );

      if (index === -1) {
        console.log('联机对战收藏未找到:', recordId);
        return false;
      }

      favorites.splice(index, 1);
      wx.setStorageSync(ONLINE_FAVORITES_KEY, favorites);
      console.log('取消联机对战收藏成功:', recordId);
      return true;
    } catch (e) {
      console.error('取消联机对战收藏失败', e);
      return false;
    }
  },

  /**
   * 检查联机对战是否已收藏
   * @param {string} recordId - 记录ID
   * @returns {boolean} 是否已收藏
   */
  isOnlineFavorite(recordId) {
    try {
      const favorites = wx.getStorageSync(ONLINE_FAVORITES_KEY) || [];
      return favorites.some(item => item._id === recordId);
    } catch (e) {
      console.error('检查联机对战收藏状态失败', e);
      return false;
    }
  },

  /**
   * 获取联机对战收藏数量
   * @returns {number} 收藏数量
   */
  getOnlineFavoriteCount() {
    try {
      const favorites = wx.getStorageSync(ONLINE_FAVORITES_KEY) || [];
      return favorites.length;
    } catch (e) {
      console.error('获取联机对战收藏数量失败', e);
      return 0;
    }
  },

  /**
   * 删除联机对战收藏记录
   * @param {string} recordId - 记录ID
   * @returns {boolean} 是否成功
   */
  deleteOnlineFavorite(recordId) {
    return this.removeOnlineFavorite(recordId);
  }
};

// ==================== 模块导出 ====================

module.exports = HistoryManager;
