
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
},

downloadPDF(e) {
  const item = e.currentTarget.dataset.item;  // 获取当前项（你要传到云函数的参数）
  console.log(item);  // 打印出来检查数据是否正确

  wx.cloud.callFunction({
    name: 'generatePdf',
    data: {
      inputText: item.inputText,
      createdAt: item.createdAt,
      images: item.images,

    },
    success: res => {
      const base64 = res.result.fileContent;

      const filePath = `${wx.env.USER_DATA_PATH}/temp.pdf`;
      const fs = wx.getFileSystemManager();

      fs.writeFile({
        filePath: filePath,
        data: base64,
        encoding: 'base64', // 关键点：必须是 base64！
        success: () => {
          wx.openDocument({
            filePath: filePath,
            fileType: 'pdf',
            success: () => {
              console.log('✅ PDF 打开成功');
            },
            fail: err => {
              console.error('❌ PDF 打开失败', err);
            }
          });
        },
        fail: err => {
          console.error('❌ 写入文件失败', err);
        }
      });
    },
    fail: err => {
      console.error('❌ 云函数调用失败', err);
    }
  });
}


}





)

