Page({
  data: {
    userInput: '',
    reply: ''
  },

  onInput(e) {
    this.setData({
      userInput: e.detail.value
    });
  },

  submitToDoubao() {
    const content = this.data.userInput.trim();
    if (!content) {
      wx.showToast({
        title: '请输入问题',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      method: 'POST',
      timeout: 60000, 
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer cae5d8c2-cd63-463c-8986-f5cb3f1c3ece'  // ⚠️生产中建议移到后端
      },
      data: {
        model: 'doubao-seed-1-6-flash-250615',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: content
              }
            ]
          }
        ]
      },
      success: (res) => {
        wx.hideLoading();
        const content = res.data?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim() !== '') {
          this.setData({ reply: content });
        } else {
          this.setData({ reply: '未获取到回复' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('请求失败：', err);
        wx.showToast({
          title: '请求失败',
          icon: 'none'
        });
      }
    });
  }
});
