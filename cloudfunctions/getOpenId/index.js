// cloudfunctions/getOpenId/index.js
const cloud = require('wx-server-sdk');
cloud.init();

/**
 * 获取用户 OpenID
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID
  };
};
