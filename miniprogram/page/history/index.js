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
        this.data.historyList = this.data.historyList.map(item => {
          // 确保 createdAt 字段是 Date 对象
          item.createdAt = new Date(item.createdAt).toLocaleString();
          return item;
        });
        this.setData({
          historyList: this.data.historyList  // 更新数据
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

