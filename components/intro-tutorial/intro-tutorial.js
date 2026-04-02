// 引导式新手教程组件逻辑
Component({
  // 组件属性
  properties: {
    // 是否显示教程（外部可控制）
    show: {
      type: Boolean,
      value: false
    }
  },

  // 组件内部数据
  data: {
    visible: false,              // 是否可见
    currentStepIndex: 0,         // 当前步骤索引
    highlightTop: 0,             // 高亮框顶部位置
    highlightLeft: 0,            // 高亮框左侧位置
    highlightWidth: 0,           // 高亮框宽度
    highlightHeight: 0,          // 高亮框高度
    bubbleTop: 0,                // 气泡框顶部位置
    currentStepText: '',         // 当前步骤文案
    isLastStep: false,           // 是否是最后一步
    totalSteps: 4,               // 总步骤数

    // 引导步骤配置
    steps: [
      {
        targetId: 'step-modes',  // 目标元素ID
        text: '欢迎来到"谁输谁洗碗"！这里有多种派对游戏模式，点击即可开始对局决出胜负哦！',
        padding: 8,              // 高亮框内边距
        bubbleOffset: 180        // 气泡向上偏移距离（避免重叠）
      },
      {
        targetId: 'step-history',
        text: '想要回顾历史战绩，或者看看谁洗碗的次数最多？点击这里查看。',
        padding: 8,
        bubbleOffset: 180
      },
      {
        targetId: 'step-settings', // 震动开关
        targetId2: 'step-bgm',     // BGM开关（第二个高亮元素）
        text: '在这里可以快速开启或关闭游戏的震动与音效体验。',
        padding: 8,
        bubbleOffset: 140
      },
      {
        targetId: 'step-rule',
        text: '如果在游戏中遇到不懂的地方，点击这里可以随时查看详细的游戏规则。快去开始第一局吧！',
        padding: 8,
        bubbleOffset: 170
      }
    ]
  },

  // 生命周期
  lifetimes: {
    attached() {
      // 组件加载时检查是否需要显示
      this.checkShouldShow();
    },
    ready() {
      // 页面 ready 后再检查一次（确保元素已渲染）
      const { visible } = this.data;
      if (!visible) {
        this.checkShouldShow();
      }
    }
  },

  // 数据监听器
  observers: {
    'show': function(show) {
      if (show) {
        this.startTutorial();
      }
    },
    // 监听步骤索引变化，更新当前步骤文案和是否最后一步
    'currentStepIndex, steps': function(currentStepIndex, steps) {
      const currentStep = steps[currentStepIndex] || {};
      this.setData({
        currentStepText: currentStep.text || '',
        isLastStep: currentStepIndex === steps.length - 1
      });
    }
  },

  // 组件方法
  methods: {
    /**
     * 检查是否应该显示教程
     * 根据本地存储判断用户是否已看过
     */
    checkShouldShow() {
      try {
        // 如果已经在显示中，不再重复启动
        if (this.data.visible) {
          return;
        }
        
        const hasSeen = wx.getStorageSync('has_seen_tutorial_v2');
        if (!hasSeen) {
          // 延迟显示，确保页面已渲染完成
          setTimeout(() => {
            this.startTutorial();
          }, 800);
        }
      } catch (e) {
        console.error('检查教程状态失败:', e);
        // 出错时默认显示教程
        setTimeout(() => {
          this.startTutorial();
        }, 800);
      }
    },

    /**
     * 开始教程
     */
    startTutorial() {
      this.setData({
        visible: true,
        currentStepIndex: 0
      }, () => {
        // 等待渲染完成后定位
        setTimeout(() => {
          this.positionHighlight();
        }, 100);
      });
    },

    /**
     * 定位高亮框和气泡框
     * 使用 wx.createSelectorQuery 获取目标元素位置
     * 注意：需要在父页面上下文中查询，因为目标元素在页面上不在组件内
     */
    positionHighlight() {
      const currentStepIndex = this.data.currentStepIndex;
      const steps = this.data.steps;
      const currentStep = steps[currentStepIndex];
      
      if (!currentStep) return;

      // 获取页面实例进行查询（目标元素在父页面上）
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      if (!currentPage) {
        console.warn('无法获取当前页面实例');
        return;
      }

      const query = wx.createSelectorQuery().in(currentPage);
      
      // 获取目标元素位置
      query.select(`#${currentStep.targetId}`).boundingClientRect();
      
      // 如果有第二个目标元素（如第三步的两个开关），也获取其位置
      if (currentStep.targetId2) {
        query.select(`#${currentStep.targetId2}`).boundingClientRect();
      }
      
      query.selectViewport().boundingClientRect();
      
      query.exec((res) => {
        if (!res || !res[0]) {
          console.warn(`未找到目标元素: ${currentStep.targetId}`);
          return;
        }

        const targetRect = res[0];
        const padding = currentStep.padding || 8;
        const bubbleOffset = currentStep.bubbleOffset || 140;

        let highlightTop, highlightLeft, highlightWidth, highlightHeight;

        // 如果有第二个元素，计算包含两个元素的整体区域
        if (currentStep.targetId2 && res[1]) {
          const targetRect2 = res[1];
          // 计算两个元素的外接矩形
          const minTop = Math.min(targetRect.top, targetRect2.top);
          const minLeft = Math.min(targetRect.left, targetRect2.left);
          const maxBottom = Math.max(targetRect.top + targetRect.height, targetRect2.top + targetRect2.height);
          const maxRight = Math.max(targetRect.left + targetRect.width, targetRect2.left + targetRect2.width);
          
          highlightTop = minTop - padding;
          highlightLeft = minLeft - padding;
          highlightWidth = maxRight - minLeft + padding * 2;
          highlightHeight = maxBottom - minTop + padding * 2;
        } else {
          // 单个元素
          highlightTop = targetRect.top - padding;
          highlightLeft = targetRect.left - padding;
          highlightWidth = targetRect.width + padding * 2;
          highlightHeight = targetRect.height + padding * 2;
        }

        // 计算气泡框位置（默认显示在目标元素上方，使用配置的偏移距离）
        let bubbleTop = highlightTop - bubbleOffset;

        // 边界检查：如果上方空间不足，显示在下方
        if (bubbleTop < 20) {
          bubbleTop = highlightTop + highlightHeight + 16;
        }

        this.setData({
          highlightTop,
          highlightLeft,
          highlightWidth,
          highlightHeight,
          bubbleTop
        });
      });
    },

    /**
     * 下一步按钮点击事件
     */
    onNext() {
      if (this.data.currentStepIndex < this.data.steps.length - 1) {
        // 还有下一步
        this.setData({
          currentStepIndex: this.data.currentStepIndex + 1
        }, () => {
          this.positionHighlight();
        });
      } else {
        // 最后一步，完成教程
        this.finishTutorial();
      }
    },

    /**
     * 跳过按钮点击事件
     */
    onSkip() {
      this.finishTutorial();
    },

    /**
     * 完成教程
     * 保存状态到本地存储并隐藏组件
     */
    finishTutorial() {
      try {
        wx.setStorageSync('has_seen_tutorial_v2', true);
      } catch (e) {
        console.error('保存教程状态失败:', e);
      }

      this.setData({
        visible: false
      });

      // 触发完成事件给父页面
      this.triggerEvent('complete');
    }
  }
});
