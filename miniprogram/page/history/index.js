const marked = require('../../util/marked.umd.js')
Page({
  data: {
    historyList: [],
    allHistoryList: [], // 保留全部数据
    searchKeyword: ''
  },


  onLoad() {
    wx.cloud.database().collection('history')
      .get()
      .then(({ data }) => {
        const processed = data.map(item => {
          const createdDate = new Date(item.createdAt); // 强制转为 Date1
          // const previewSegments = (item.description || []).slice(0, 2);
          // const previewText = previewSegments.join('；').replace(/[\r\n]+/g, ' ');
          // const mdDescription = item.description;
          // md本
          const mdStr = (item.description || []).join('\n\n');
          const html = marked.parse(mdStr);
          // md简短版
          const previewMdStr = (item.description || []).join('\n\n');
          // 用 Markdown 原文生成 previewText（干净的摘要）
          const previewHtmlText = previewMdStr
          .replace(/[#>*`-]/g, '')        // 去掉 markdown 标记
          .replace(/[\r\n]+/g, ' ')       // 换行转空格
          .slice(0, 50) + '...'

          // const previewHtml = marked.parse(previewMdStr);
          // const maxLength = 50;
  
          return {
            ...item,
            createdAt: createdDate,  
            createdAtFormatted: createdDate.toLocaleString('zh-CN', { hour12: false }),
            // descriptionPreview: previewText.length > maxLength
            //   ? previewText.slice(0, maxLength) + '...'
            //   : previewText,
            showFullDescription: false,
            descriptionHtml: html,
            descriptionHtmlPreview: previewHtmlText
            
            // mdDescription = mdDescription
          };
        });

        // 正确排序逻辑：先收藏优先，再按时间倒序（新在前）
        const sortedList = processed.sort((a, b) => {
          if (a.isFavor === b.isFavor) {
            return b.createdAt.getTime() - a.createdAt.getTime(); // 时间倒序
          }
          return b.isFavor - a.isFavor; // 收藏在前
        });

        // const Description  = marked.parse(mdDescription)
        
  
        this.setData({
          historyList: sortedList,
          allHistoryList: sortedList,
          // html: Description 
        });
      })
      .catch(err => {
        console.error('❌ 获取失败', err);
      });
  },
  
  
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });

    // 若输入被清空，自动还原历史列表
    if (!keyword.trim()) {
      this.setData({
        historyList: this.data.allHistoryList
      });
    }
  },



  onSearchConfirm() {
    const keyword = this.data.searchKeyword.trim().toLowerCase();
    if (!keyword) {
      this.setData({
        historyList: this.data.allHistoryList
      });
      return;
    }

    const filteredList = this.data.allHistoryList.filter(item => {
      const inputMatch = item.inputText && item.inputText.toLowerCase().includes(keyword);
      const descMatch = (item.description || []).some(desc => desc.toLowerCase().includes(keyword));
      return inputMatch || descMatch;
    });

    this.setData({ historyList: filteredList });
  },



  onClearSearch() {
    this.setData({
      searchKeyword: '',
      historyList: this.data.allHistoryList
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
                  console.error("保存图片失败:", error);
                  reject('保存图片失败');  // 如果保存失败，调用 reject
                }
              });
            } else {
              console.error("下载图片失败, 状态码:", res.statusCode);
              reject('下载图片失败1');  // 如果下载失败，调用 reject
            }
          },
          fail: () => {
            console.error("下载图片失败:", error);
            reject('下载图片失败2');  // 如果下载失败，调用 reject
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
  },

  downloadVideo: function (e) {
    const videoUrl = e.currentTarget.dataset.url;  // 获取传递的 video URL
    console.log(videoUrl);  // 打印视频 URL 以进行调试

    if (!videoUrl) {
      wx.showToast({
        title: '视频链接无效',
        icon: 'error'
      });
      return;
    }

    // 下载视频文件
    wx.downloadFile({
      url: videoUrl,  // 视频的 URL
      success: (res) => {
        if (res.statusCode === 200) {
          // 下载成功，获取临时文件路径
          let tempFilePath = res.tempFilePath;

          // 尝试保存视频到相册
          wx.saveVideoToPhotosAlbum({
            filePath: tempFilePath,  // 临时文件路径
            success: function () {
              wx.showToast({
                title: '视频已保存到相册',
                icon: 'success'
              });
            },
            fail: function (error) {
              console.error('保存视频失败:', error);  // 打印错误信息
              wx.showToast({
                title: '保存失败',
                icon: 'error'
              });
            }
          });
        }
      },
      fail: (error) => {
        console.error('下载视频失败:', error);  // 打印下载错误信息
        wx.showToast({
          title: '下载失败',
          icon: 'error'
        });
      }
    });
  }

})