Page({
  data: {
    historyList: []
  },




  onLoad() {
    wx.cloud.database().collection('history')
      .orderBy('createdAt', 'desc')
      .get()
      .then(({ data }) => {
        console.log('📦 获取历史记录成功', data);
        this.setData({ historyList: data });
      })
      .catch(err => {
        console.error('❌ 获取失败', err);
      });
  },
  
  

  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },


})