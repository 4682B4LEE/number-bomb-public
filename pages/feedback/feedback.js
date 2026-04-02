const app = getApp();

Page({
  data: {
    statusBarHeight: 20, // 默认状态栏高度
    currentView: 'list', // 'list', 'submit', 'detail'
    isRefreshing: false, // 是否正在刷新

    // 表单状态
    nickname: '',
    typeArray: ['🔴 BUG 反馈', '🟡 优化及玩法建议', '⚪ 其他'],
    typeIndex: 0,
    content: '',
    appVersion: 'v2.2.0', // 版本号，与首页保持一致

    // 选中的详情项
    selectedItem: null,

    // 反馈列表数据
    feedbacks: []
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ isRefreshing: true });
    this.refreshFeedbacks();
    // 1秒后关闭刷新状态
    setTimeout(() => {
      this.setData({ isRefreshing: false });
    }, 1000);
  },

  onLoad(options) {
    // 获取设备状态栏高度，适配刘海屏
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    });

    // 从页面参数获取版本号
    if (options.version) {
      this.setData({
        appVersion: 'v' + options.version
      });
    }

    // 自动获取用户昵称
    this.loadUserInfo();

    // 加载反馈列表（带缓存）
    this.fetchFeedbacksWithCache();
  },

  onShow() {
    // 检查是否需要刷新（每天只刷新一次）
    this.checkAndRefreshFeedbacks();
  },

  // 检查并刷新反馈列表（每天只刷新一次）
  checkAndRefreshFeedbacks() {
    const lastFetchDate = wx.getStorageSync('feedbackLastFetchDate');
    const today = new Date().toDateString();

    // 如果今天还没有刷新过，则刷新
    if (lastFetchDate !== today) {
      this.fetchFeedbacksWithCache();
    }
  },

  // 加载用户信息
  loadUserInfo() {
    // 从全局数据获取用户信息
    const userInfo = app.globalData.userInfo;
    if (userInfo && userInfo.nickName) {
      this.setData({
        nickname: userInfo.nickName
      });
    } else {
      // 尝试从本地存储获取
      const storedUserInfo = wx.getStorageSync('userInfo');
      if (storedUserInfo && storedUserInfo.nickName) {
        this.setData({
          nickname: storedUserInfo.nickName
        });
      }
    }
  },

  // 获取反馈列表（带缓存）
  fetchFeedbacksWithCache() {
    // 先尝试从缓存加载
    const cachedFeedbacks = wx.getStorageSync('feedbackCache');
    const lastFetchDate = wx.getStorageSync('feedbackLastFetchDate');
    const today = new Date().toDateString();

    // 如果有缓存且是今天的，直接使用缓存
    if (cachedFeedbacks && lastFetchDate === today) {
      this.setData({ feedbacks: cachedFeedbacks });
      return;
    }

    // 否则从云端获取
    this.fetchFeedbacksFromCloud();
  },

  // 从云端获取反馈列表
  fetchFeedbacksFromCloud() {
    wx.showLoading({ title: '加载中...' });
    wx.cloud.callFunction({
      name: 'feedback_api',
      data: { action: 'getFeedbackList' }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        // 处理反馈数据，根据reply字段更新状态
        const feedbacks = res.result.data.map(item => {
          // 如果开发者回复不为空，状态显示为已回复
          if (item.reply && item.reply.trim() !== '') {
            item.status = '已回复';
          }
          return item;
        });

        // 更新页面数据
        this.setData({ feedbacks });

        // 缓存到本地
        wx.setStorageSync('feedbackCache', feedbacks);
        wx.setStorageSync('feedbackLastFetchDate', new Date().toDateString());
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('获取反馈列表失败:', err);
      wx.showToast({ title: '获取失败', icon: 'none' });
    });
  },

  // 手动刷新反馈列表（下拉刷新或用户主动刷新）
  refreshFeedbacks() {
    this.fetchFeedbacksFromCloud();
  },

  // 返回按钮点击处理
  onBack() {
    const { currentView } = this.data;
    if (currentView === 'list') {
      // 在列表页，返回上一页（首页）
      wx.navigateBack({ delta: 1 });
    } else {
      // 在提交页或详情页，返回列表页
      this.setData({ currentView: 'list' });
    }
  },

  // 导航方法
  goToSubmit() {
    this.setData({ currentView: 'submit' });
  },

  goToDetail(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      selectedItem: item,
      currentView: 'detail'
    });
  },

  // 表单双向绑定
  onTypeChange(e) {
    this.setData({ typeIndex: e.detail.value });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // 提交逻辑
  handleSubmit() {
    const { nickname, typeArray, typeIndex, content, appVersion } = this.data;

    if (!content.trim()) {
      wx.showToast({
        title: '请填写问题内容',
        icon: 'none'
      });
      return;
    }

    // 解析类型名称和类名
    const fullTypeStr = typeArray[typeIndex];
    let typeName = '其他';
    let typeClass = 'type-oth';

    if (fullTypeStr.includes('BUG')) {
      typeName = 'BUG 反馈';
      typeClass = 'type-bug';
    } else if (fullTypeStr.includes('优化')) {
      typeName = '优化及玩法建议';
      typeClass = 'type-adv';
    }

    wx.showLoading({ title: '提交中...' });
    wx.cloud.callFunction({
      name: 'feedback_api',
      data: {
        action: 'submitFeedback',
        payload: {
          nickname: nickname || '匿名用户',
          type: typeName,
          typeClass: typeClass,
          content: content,
          version: appVersion // 使用当前版本号
        }
      }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        wx.showToast({ title: '提交成功', icon: 'success' });
        // 清空表单并切回列表页
        this.setData({ content: '', typeIndex: 0, currentView: 'list' });
        // 重新拉取列表数据（强制刷新）
        this.refreshFeedbacks();
      } else {
        wx.showToast({ title: res.result.msg || '提交失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('提交反馈失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    });
  },

  // 分享到微信好友
  onShareAppMessage: function () {
    return {
      title: '谁输谁洗碗 - 反馈建议',
      path: '/pages/feedback/feedback',
      imageUrl: '/images/share-cover.png'
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '谁输谁洗碗 - 反馈建议',
      query: '',
      imageUrl: '/images/share-cover.png'
    };
  }
});
