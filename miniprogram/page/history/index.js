Page({
  data: {
    historyList: []
  },

  onLoad() {
    const db = wx.cloud.database()
    db.collection('history')
      .orderBy('createdAt', 'desc')
      .get()
      .then(res => {
        console.log('📦 获取历史记录成功', res.data)
        this.setData({
          historyList: res.data
        })
      })
      .catch(err => {
        console.error('❌ 获取失败', err)
      })
  },

  goBack() {
    wx.navigateBack({
    delta: 1
  })
}

}





)

