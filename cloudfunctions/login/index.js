// cloudfunctions/login/index.js

const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 获取 openid
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  }
}
