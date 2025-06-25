Page({
  data: {
    userInfo: null,
    avatars: [
      { name: '头像1', src: '../../image/maodie1.png' },
      { name: '头像2', src: '../../image/maodie2.png' },
      { name: '头像3', src: '../../image/maodie3.png' },
      { name: '头像4', src: '../../image/maodie4.png' },
      { name: '头像5', src: '../../image/maodie5.png' }

    ],
    currentAvatar: '../../image/maodie.png',  // 默认头像路径

    isEditing: false,  // 是否处于编辑状态
    newNickname: '',  // 存储输入的昵称
  },

  onLoad() {
    wx.cloud.init({
      env: 'cloud1-8gmijxcx249b2dbf'  // 请使用正确的环境ID
    });

  
    // 获取系统信息（可选，用于布局调整）
    const systemInfo = wx.getSystemInfoSync();
   
    console.log('页面宽高：', systemInfo.windowWidth, systemInfo.windowHeight);
  
    
    // 从全局数据获取用户信息
    const userInfo = getApp().globalData.userInfo;
     // 同步从云数据库获取最新的头像和昵称
    this.setData({  
      userInfo: userInfo,
      // newNickname: userInfo.nickName || '微信用户',  // 初始化为当前昵称
    });

  },
   // 获取用户信息
   getUserInfo() {
    wx.cloud.init({
      env: 'cloud1-8gmijxcx249b2dbf'  // 请使用正确的环境ID
    });

    
    
    wx.getUserProfile({
      
      desc: '用于展示您的昵称和头像',
      success: res => {
        console.log('用户信息：', res.userInfo); // 打印用户信息，确认头像字段
       

        getApp().globalData.userInfo = res.userInfo;
        const userInfo = getApp().globalData.userInfo;
        wx.showToast({
          title: '正在确认用户信息，请稍等~',
          icon: 'none',       // 不显示图标
          duration: 900      // 持续时间：1 秒（单位 ms）
        });
          this.setData({
              userInfo: userInfo
          });
            this.getAvatarFromCloud();
            this.getNickNameFromCloud();
        

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
    
  },
  // 用户点击头像时调用的函数，显示头像选择弹窗
  changeAvatar() {
    this.setData({
      showModal: true,  // 显示头像选择弹窗
    });
  },
  closeModal() {
    this.setData({
      showModal: false,  // 关闭弹窗
    });
  },
  // 点击昵称时触发，显示输入框
  editNickname() {
    this.setData({
      isEditing: true,  // 显示输入框
    });
  },

  // 监听昵称输入框的内容
  onNicknameInput(event) {
    this.setData({
      newNickname: event.detail.value,  // 更新输入的昵称
    });
  },

  // 点击保存按钮保存新的昵称
  saveNickname() {
    const newNickname = this.data.newNickname;
    if (!newNickname) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none',
      });
      return;
    }

    // 更新全局的用户信息
    getApp().globalData.userInfo.nickName = newNickname;
    this.setData({
      'userInfo.nickName': newNickname,  // 更新页面上的昵称
      isEditing: false,  // 关闭编辑框
    });

    // 保存新昵称到云数据库
    this.saveNicknameToCloud(newNickname);
  },

  // 点击取消按钮，关闭编辑框
  cancelEdit() {
    this.setData({
      isEditing: false,  // 关闭编辑框
      newNickname: this.data.userInfo.nickName,  // 恢复原昵称
    });
  },

  // 保存昵称到云数据库
  saveNicknameToCloud(newNickname) {
    const db = wx.cloud.database();
    const userCollection = db.collection('userName');  // 假设云数据库集合名为 'userName'

    // 获取用户ID（这里使用 openid 作为示例）
    const userId = getApp().globalData.userInfo.openid;

    // 更新昵称
    userCollection.add({
      data: {
        userId: userId,  // 用户唯一标识
        userName: newNickname,  // 用户的昵称
        createdAt: db.serverDate(),  // 创建时间
      },
      success(res) {
        console.log('昵称保存成功:', res);
        // 这里可以调用其他操作，更新界面等
      },
      fail(err) {
        console.error('保存昵称失败:', err);
      }
    });
  },

  // 获取云数据库中的头像信息
  getNickNameFromCloud() {
    const db = wx.cloud.database();
    const userAvatars = db.collection('userName');  // 云数据库集合

    // 获取当前用户ID
    const userId = getApp().globalData.userInfo.openid;  // 假设使用 openid 作为用户ID

    // 查询用户头像，按创建时间降序排列，获取最新的头像
    userAvatars.where({ userId: userId })
      .orderBy('createdAt', 'desc')  // 按 createdAt 降序排列
      .limit(1)  // 限制返回1条数据（最新一条记录）
      .get({
        success: (res) => {
          if (res.data.length > 0) {
            // 如果查询到最新的头像数据，更新当前头像
            this.setData({
              'userInfo.nickName': res.data[0].userName,  // 获取最新的头像
            });
          } else {
            console.log('未找到昵称数据');
          }
        },
        fail: (err) => {
          console.error('获取昵称失败', err);
        }
      });
  },
  // 用户选择头像时调用的函数
  selectAvatar(event) {
    const selectedAvatar = event.currentTarget.dataset.src;  // 获取选中的头像路径
    this.setData({
      currentAvatar: selectedAvatar,  // 更新当前头像
      showModal: false,  // 关闭弹窗
    });

    // 获取用户ID
    const userId = getApp().globalData.userInfo.openid;

    // 获取云数据库引用
    const db = wx.cloud.database();
    const userAvatars = db.collection('userAvatars');  // 指定集合

    // 保存头像路径到云数据库
    userAvatars.add({
      data: {
        userId: userId,  // 用户唯一标识
        avatarUrl: selectedAvatar,  // 选中的头像路径
        createdAt: db.serverDate(),  // 记录创建时间
      },
      success(res) {
        console.log('头像保存成功:', res);
      },
      fail(err) {
        console.error('保存头像失败:', err);
      }
    });
  },
  goToHistory() {
    wx.navigateTo({
      url: '/page/history/index'
    })
  },
  // 页面加载时获取全局用户信息
 
  

  // 获取云数据库中的头像信息
  getAvatarFromCloud() {
    const db = wx.cloud.database();
    const userAvatars = db.collection('userAvatars');  // 云数据库集合

    // 获取当前用户ID
    const userId = getApp().globalData.userInfo.openid;  // 假设使用 openid 作为用户ID

    // 查询用户头像，按创建时间降序排列，获取最新的头像
  userAvatars.where({ userId: userId })
  .orderBy('createdAt', 'desc')  // 按 createdAt 降序排列
  .limit(1)  // 限制返回1条数据（最新一条记录）
  .get({
    success: (res) => {
      if (res.data.length > 0) {
        // 如果查询到最新的头像数据，更新当前头像
        this.setData({
          currentAvatar: res.data[0].avatarUrl,  // 获取最新的头像
        });
      } else {
        console.log('未找到头像数据');
      }
    },
    fail: (err) => {
      console.error('获取头像失败', err);
    }
  });
  },
  
});
