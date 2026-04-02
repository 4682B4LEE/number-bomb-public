// cloudfunctions/submitDailyResult/index.js
const cloud = require('wx-server-sdk');
cloud.init();

const db = cloud.database();
const _ = db.command;

function getChinaDateString() {
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return chinaTime.toISOString().split('T')[0];
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { status, guessCount, timeUsed } = event;
  const today = getChinaDateString();
  const docId = `${today}_${openid}`;

  console.log('提交结果请求:', { status, guessCount, timeUsed, docId });

  try {
    // 先检查文档是否存在
    let doc;
    try {
      doc = await db.collection('daily_challenges').doc(docId).get();
    } catch (err) {
      console.error('获取文档失败:', err);
      return {
        success: false,
        error: '未找到今日挑战记录，请先开始挑战'
      };
    }

    if (!doc || !doc.data) {
      return {
        success: false,
        error: '未找到今日挑战记录'
      };
    }

    console.log('找到文档:', doc.data);

    // 如果是退出状态，不扣次数（startDailyChallenge 已经扣过了），仅更新 updateTime
    if (status === 'quit') {
      await db.collection('daily_challenges').doc(docId).update({
        data: {
          updateTime: db.serverDate()
        }
      });

      return {
        success: true,
        message: '已记录退出',
        attemptsLeft: doc.data.attemptsLeft
      };
    }

    // 成功通关，比较并更新最好成绩
    if (status === 'success') {
      const currentBest = doc.data.bestScore;
      let shouldUpdate = false;

      if (!currentBest) {
        // 第一次成功
        shouldUpdate = true;
        console.log('第一次成功，需要更新');
      } else {
        // 比较成绩：次数少优先，次数相同则用时短优先
        if (guessCount < currentBest.guessCount) {
          shouldUpdate = true;
          console.log('次数更少，需要更新');
        } else if (guessCount === currentBest.guessCount && timeUsed < currentBest.timeUsed) {
          shouldUpdate = true;
          console.log('次数相同但用时更短，需要更新');
        } else {
          console.log('成绩不如当前最佳，不更新');
        }
      }

      if (shouldUpdate) {
        console.log('更新最佳成绩:', { guessCount, timeUsed });

        // ⚠️ 关键修复：使用 _.set() 来替换 bestScore 字段
        // 这样可以正确处理 bestScore 为 null 的情况
        await db.collection('daily_challenges').doc(docId).update({
          data: {
            bestScore: _.set({
              guessCount: Number(guessCount),
              timeUsed: Number(timeUsed),
              achievedAt: db.serverDate()
            }),
            updateTime: db.serverDate()
          }
        });

        console.log('更新成功');
      }

      return {
        success: true,
        isNewBest: shouldUpdate,
        bestScore: {
          guessCount: guessCount,
          timeUsed: timeUsed
        },
        attemptsLeft: doc.data.attemptsLeft
      };
    }

    return {
      success: false,
      error: '未知状态: ' + status
    };

  } catch (err) {
    console.error('提交结果失败:', err);
    return {
      success: false,
      error: err.message || '提交失败'
    };
  }
};
