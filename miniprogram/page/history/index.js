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
  
  
  onToggleFavor(e) {
    const id = e.currentTarget.dataset.id;
    const db = wx.cloud.database();
    const list = this.data.historyList;
    const index = list.findIndex(item => item._id === id);
    if (index === -1) return;
  
    const currentFavor = list[index].isFavor;
    const newFavor = !currentFavor;
  
    wx.showLoading({ title: newFavor ? '收藏中...' : '取消收藏中...' });
  
    db.collection('history').doc(id).update({
      data: { isFavor: newFavor }
    }).then(() => {
      wx.hideLoading();
      wx.showToast({ title: newFavor ? '已收藏' : '取消收藏', icon: 'success' });
  
      // ✅ 本地状态更新
      list[index].isFavor = newFavor;
  
      // ✅ 重新排序
      const sortedList = [...list].sort((a, b) => {
        if (a.isFavor === b.isFavor) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return b.isFavor - a.isFavor;
      });
  
      // ✅ 更新数据触发 UI 渲染
      this.setData({ historyList: sortedList });
    }).catch(err => {
      wx.hideLoading();
      console.error('收藏切换失败', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
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

  downloadAllImages: function (e) {
    const item = e.currentTarget.dataset.item;  // 获取传递过来的 item 对象
    console.log(item);  // 打印 item 以调试数据是否正确传递
  
    // 增加空值检查
    if (!item || !item.images || item.images.length === 0) {
      wx.showToast({
        title: '没有图片数据可下载',
        icon: 'error'
      });
      return;  // 如果没有图片数据，则退出
    }
  
    const images = item.images;  // 获取 item.images 数组
    const totalImages = images.length;  // 获取图片的总数
    let downloadPromises = [];  // 用来存储每个图片下载的 Promise
  
    images.forEach((imageUrl) => {
      // 创建一个 Promise 来下载每张图片
      const downloadPromise = new Promise((resolve, reject) => {
        wx.downloadFile({
          url: imageUrl,  // 图片的 URL
          success: (res) => {
            if (res.statusCode === 200) {
              // 下载成功，保存到相册
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  resolve();  // 下载和保存成功后，调用 resolve
                },
                fail: () => {
                  reject('保存图片失败');  // 如果保存失败，调用 reject
                }
              });
            } else {
              reject('下载图片失败');  // 如果下载失败，调用 reject
            }
          },
          fail: () => {
            reject('下载图片失败');  // 如果下载失败，调用 reject
          }
        });
      });
  
      // 将每个 Promise 添加到数组中
      downloadPromises.push(downloadPromise);
    });
  
    // 使用 Promise.all 来等待所有图片的下载和保存完成
    Promise.all(downloadPromises)
      .then(() => {
        // 当所有图片下载并保存完毕后，显示提示
        wx.showToast({
          title: '所有图片已保存到相册！',
          icon: 'success'
        });
      })
      .catch((error) => {
        // 如果有任何一个下载或保存失败，显示错误提示
        wx.showToast({
          title: error || '图片下载失败',
          icon: 'error'
        });
      });
  }
  

})