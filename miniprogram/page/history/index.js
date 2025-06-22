Page({
  data: {
    historyList: []
  },




  onLoad() {
    wx.cloud.database().collection('history')
      .orderBy('createdAt', 'desc')
      .get()
      .then(({ data }) => {
        const list = data.map(item => {
          // 取前两段描述，防止预览过长
          const previewSegments = (item.description || []).slice(0, 2);
          // 用中文分号连接
          let previewText = previewSegments.join('；');
          // 替换换行符为空格，防止显示中断
          previewText = previewText.replace(/[\r\n]+/g, ' ');
          // 根据长度决定是否截断
          const maxLength = 50;
          const descriptionPreview = previewText.length > maxLength
            ? previewText.slice(0, maxLength) + '...'
            : previewText;
  
          return {
            ...item,
            showFullDescription: false,
            descriptionPreview
          };
        });
        this.setData({ historyList: list });
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
  toggleDescription(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.historyList;
    list[index].showFullDescription = !list[index].showFullDescription;
    this.setData({ historyList: list });
  },
  

  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },


})