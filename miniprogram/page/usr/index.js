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
    currentAvatar: '../../image/maodie.png', // 默认头像
    isEditing: false,
    newNickname: '',
    showModal: false
  },

  onLoad() {
    wx.cloud.init({ env: 'cloud1-8gmijxcx249b2dbf' });
    const userInfo = getApp().globalData.userInfo;
    if (userInfo?.openid) {
      this.setData({ userInfo });
      this.getUserProfileFromCloud(); // 获取用户最新数据
    }
  },
  getUserInfo() {
    const app = getApp();
    wx.getUserProfile({
      desc: '用于展示您的昵称和头像',
      success: res => {
        app.getUserOpenId((err, openid) => {
          if (err) {
            console.error('获取openid失败', err);
            wx.showToast({ title: '登录失败', icon: 'none' });
            return;
          }
          // console.log('userInfo：', res.userInfo);
          const fullUserInfo = {
            ...res.userInfo,
            openid
          };
          
          // 更新全局和本地数据
          app.globalData.userInfo = fullUserInfo;
          this.setData({ userInfo: fullUserInfo });
          
          // 初始化或更新云数据库
          this.initOrUpdateUserProfile(fullUserInfo);
        });
      },
      fail: () => {
        wx.showToast({ title: '授权失败，进入游客模式', icon: 'none' });
        const guestInfo = { nickName: '游客', avatarUrl: '', openid: 'guest' };
        getApp().globalData.userInfo = guestInfo;
        this.setData({ userInfo: guestInfo });
      }
    });
  },

  initOrUpdateUserProfile(userInfo) {
    const db = wx.cloud.database();
    const openid = userInfo.openid;
  
    if (!openid) {
      console.error('❌ 无效的 openid，无法初始化或更新用户信息');
      return;
    }
  
    const userDocRef = db.collection('userProfile').doc(openid);
  
    userDocRef.get()
      .then(res => {
        // 文档存在，不做任何远程更新，只同步云端数据到本地即可
        console.log('用户已存在，初始化时不更新远程数据');
        this.setData({
          'userInfo.nickName': res.data.nickName,
          currentAvatar: res.data.avatarUrl
        });
      })
      .catch(err => {
        if (err.errMsg && err.errMsg.includes('document.get:fail')) {
          // 新用户，创建云端文档
          console.log('新用户，写入初始数据');
          userDocRef.set({
            data: {
              nickName: userInfo.nickName || '微信用户',
              avatarUrl: userInfo.avatarUrl || '',
              createdAt: db.serverDate(),
              updatedAt: db.serverDate()
            }
          }).then(() => {
            console.log('用户初始化数据写入成功');
          }).catch(setErr => {
            console.error('初始化数据写入失败', setErr);
          });
        } else {
          console.error('获取用户数据失败', err);
        }
      });
  },
  
  
  
  
  // 获取用户信息（从云数据库）
  getUserProfileFromCloud() {
    const openid = getApp().globalData.userInfo?.openid;
    if (!openid) return;
  
    const db = wx.cloud.database();
    db.collection('userProfile').doc(openid).get()
      .then(res => {
        const data = res.data || {};
        this.setData({
          'userInfo.nickName': data.nickName || this.data.userInfo.nickName,
          currentAvatar: data.avatarUrl || this.data.currentAvatar
        });
      })
      .catch(err => {
        console.error('获取用户信息失败', err);
      });
  },
  

  // 初始化新用户数据
  initUserProfile() {
    const db = wx.cloud.database();
    const { userInfo } = this.data;
    const openid = userInfo.openid;

    db.collection('userProfile').doc(openid).set({
      data: {
        nickName: userInfo.nickName || '微信用户', // 默认昵称
        avatarUrl: userInfo.avatarUrl || this.data.currentAvatar, // 默认头像
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    }).then(() => {
      console.log('新用户数据初始化成功');
    }).catch(err => {
      console.error('初始化用户数据失败', err);
    });
  },

  // 保存昵称（更新同一文档）
  saveNickname() {
    const newNickname = this.data.newNickname.trim();
    if (!newNickname) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }

    const db = wx.cloud.database();
    const openid = getApp().globalData.userInfo.openid;

    db.collection('userProfile').doc(openid).update({
      data: {
        nickName: newNickname,
        updatedAt: db.serverDate()
      }
    }).then(() => {
      this.setData({
        'userInfo.nickName': newNickname,
        isEditing: false
      });
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    }).catch(err => {
      console.error('更新昵称失败', err);
    });
  },

  // 选择头像（更新同一文档）
  selectAvatar(e) {
    const selectedAvatar = e.currentTarget.dataset.src;
    const db = wx.cloud.database();
    const openid = getApp().globalData.userInfo.openid;
    const nickName = this.data.userInfo.nickName || '微信用户';
  
    db.collection('userProfile').doc(openid).update({
      data: {
        avatarUrl: selectedAvatar,
        updatedAt: db.serverDate()
      }
    }).then(() => {
      this.setData({
        currentAvatar: selectedAvatar,
        showModal: false
      });
      wx.showToast({ title: '头像已更新', icon: 'success' });
    }).catch(err => {
      console.error('更新头像失败', err);
    });
  },
  

  editNickname() {
    this.setData({ isEditing: true });
  },

  cancelEdit() {
    this.setData({
      isEditing: false,
      newNickname: this.data.userInfo.nickName
    });
  },

  onNicknameInput(e) {
    this.setData({ newNickname: e.detail.value });
  },

  changeAvatar() {
    this.setData({ showModal: true });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  goToHistory() {
    wx.navigateTo({
      url: '/page/history/index'
    });
  }
});
