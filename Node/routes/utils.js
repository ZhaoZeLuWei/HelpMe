/**
 * 后端共享工具函数
 */

/**
 * 标准化地点 PlaceId：trim 后返回，空值返回 null
 */
function normalizeLocationPlaceId(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

module.exports = { normalizeLocationPlaceId };
