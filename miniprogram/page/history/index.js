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
  
  onDeleteConfirm(e) {
    const recordId = e.currentTarget.dataset.id;
    const that = this;
  
    wx.showModal({
      title: '确认删除？',
      content: '删除后不可恢复，是否继续？',
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#e64340',
      success(res) {
        if (res.confirm) {
          // 调用云数据库删除记录
          wx.cloud.database().collection('history').doc(recordId).remove()
            .then(() => {
              wx.showToast({ title: '删除成功', icon: 'success' });
              // 更新前端页面数据
              const newList = that.data.historyList.filter(item => item._id !== recordId);
              that.setData({ historyList: newList });
            })
            .catch(err => {
              console.error('❌ 删除失败', err);
              wx.showToast({ title: '删除失败', icon: 'error' });
            });
        }
      }
    });
  },
  

  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },


})