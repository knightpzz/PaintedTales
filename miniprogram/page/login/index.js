Page({
  data: {
    userInfo: null
  },

  // 获取用户信息
  getUserInfo() {
    wx.getUserProfile({
      desc: '用于展示您的昵称和头像',
      success: res => {
        console.log('用户信息：', res.userInfo); // 打印用户信息，确认头像字段

        // 确保头像字段存在且非空
        if (res.userInfo.avatarUrl) {
          this.setData({
            userInfo: res.userInfo
          });

          // 将用户信息保存到全局数据
          getApp().globalData.userInfo = res.userInfo;

          // 获取 OpenID 并跳转
          getApp().getUserOpenId(openid => {
            getApp().globalData.openid = openid;

            // 登录成功后跳转到主页
            wx.redirectTo({
              url: '/page/home/index'  // 跳转到主页
            });
          });
        } else {
          wx.showToast({
            title: '头像获取失败，请稍后再试',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '授权失败，请重试！',
          icon: 'none'
        });

        // 游客模式，将信息保存到全局数据
        this.setData({
          userInfo: {
            nickName: '游客',
            avatarUrl: ''
          }
        });

        // 选择游客登录，跳转到主页
        getApp().globalData.userInfo = this.data.userInfo;

        wx.redirectTo({
          url: '/page/home/index'  // 跳转到主页
        });
      }
    });
  }
});
