/**
 * 匿名信息生成工具
 * 用于排行榜实时脱敏
 */

// 统一使用小程序内的本地绝对路径，节省 CDN 流量且加载更快
const DEFAULT_AVATARS = [
  '/images/default-avatar-1.png',
  '/images/default-avatar-2.png',
  '/images/default-avatar-3.png',
  '/images/default-avatar-4.png',
  '/images/default-avatar-6.png',
  '/images/default-avatar-7.png',
  '/images/default-avatar-8.png'
];

const ANONYMOUS_PREFIX = '玩家';

/**
 * 根据用户ID生成固定的匿名昵称
 * @param {string} userId - 用户ID
 * @returns {string} 匿名昵称
 */
function generateAnonymousName(userId) {
  if (!userId) return `${ANONYMOUS_PREFIX}000`;
  const suffix = userId.slice(-4).toUpperCase();
  return `${ANONYMOUS_PREFIX}${suffix}`;
}

/**
 * 根据用户ID生成固定的默认头像
 * @param {string} userId - 用户ID
 * @returns {string} 默认头像URL
 */
function generateDefaultAvatar(userId) {
  if (!userId) return DEFAULT_AVATARS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return DEFAULT_AVATARS[Math.abs(hash) % DEFAULT_AVATARS.length];
}

module.exports = {
  generateAnonymousName,
  generateDefaultAvatar
};
