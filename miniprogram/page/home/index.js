Page({
  data: {
    userInfo: {},    // 存储用户信息
    userInput: '',
    reply: '',
    descriptionList: [], // 五段插画描述，建议从豆包返回结果中解析
    imageList: [] // 存放五张图地址
  },

  
  


  

  goToHistory() {
    wx.navigateTo({
      url: '/page/history/index'
    })
  },

  // 页面加载时获取全局用户信息
  onLoad() {

    wx.cloud.init({
      env: 'cloud1-8gmijxcx249b2dbf'  // 请使用正确的环境ID
    });
    const userInfo = getApp().globalData.userInfo || {};  // 获取全局数据中的用户信息
    this.setData({ userInfo });
  },

  onInput(e) {
    this.setData({
      userInput: e.detail.value
    });
  },

  // 清理非法字符（HTML、符号、emoji）
  sanitizeInput(str) {
    return str
      .replace(/<[^>]*>/g, '')                      // 移除HTML标签
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '')  // 只保留中英数字和空格
      .trim();
  },

  validateKeywords(keywords) {
    const invalidPattern = /[<>\/\\'"`@#$%^&*_=+\[\]{}|~]/;
    return keywords.every(word => !invalidPattern.test(word));
  },

  submitToDoubao() {
    const rawInput = this.data.userInput.trim();
    const cleanedInput = this.sanitizeInput(rawInput);

    const keywords = cleanedInput
      .split(/[\s,，、]+/)
      .filter(k => k.length > 0)
      .slice(0, 5);

    if (keywords.length === 0) {
      wx.showToast({ title: '请至少输入1个关键词', icon: 'none' });
      return;
    }

    if (!this.validateKeywords(keywords)) {
      wx.showToast({ title: '关键字含有非法字符', icon: 'none' });
      return;
    }

    const keywordStr = keywords.map(k => `“${k}”`).join('、');
    const prompt = `请以${keywordStr}为主题写一段童话故事，总共分为5个段落，总字数不超过300字。`;

    wx.showLoading({ title: '生成中...', mask: true });

    wx.request({
      url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      method: 'POST',
      timeout: 30000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer cae5d8c2-cd63-463c-8986-f5cb3f1c3ece'  // ⚠️生产中请勿暴露！
      },
      data: {
        model: 'doubao-seed-1-6-flash-250615',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      success: (res) => {
        wx.hideLoading();
        const story = res.data?.choices?.[0]?.message?.content;
        console.log('豆包童话内容：', story);

        if (typeof story === 'string' && story.trim()) {
          this.setData({ reply: story });

          // 🔹 构造插画生成 Prompt
          const cleanStory = story.replace(/###\s*/g, '');  // 可选：去掉“### 第一段”
          const illustrationPrompt = `请以下面这五段童话为基础，每段童话生成一张插画，插画与文字内容相匹配，童话如下：\n${cleanStory}`;

          // console.log('提交给插画生成的提示语：\n', illustrationPrompt);
          const paragraphs = story
            .split(/\n{2,}|\r\n\r\n/)
            .map(p => p.trim())
            .filter(p => p.length > 10)
            .slice(0, 5); // 最多5段

          if (paragraphs.length === 0) {
            wx.showToast({ title: '童话分段失败', icon: 'none' });
            return;
          }
          this.setData({ descriptionList: paragraphs }, () => {
            this.generateAllImages();
          });
        } else {
          wx.showToast({ title: '生成失败', icon: 'none' });
        }
      }
      ,
      fail: (err) => {
        wx.hideLoading();
        console.error('请求失败：', err);
        wx.showToast({ title: '请求失败', icon: 'none' });
      }
    });
  },
  generateAllImages() {
    wx.showLoading({ title: '生成插画中...' });
    const promises = this.data.descriptionList.map(desc => this.generateImage(desc));
    Promise.all(promises).then(urls => {
      wx.hideLoading();
      console.log('图片数组:', urls);

      // ⭐ 保存历史记录到数据库
      const db = wx.cloud.database()
      db.collection('history').add({
        data: {
          inputText: this.data.userInput || '', // 可选输入关键词
          images: urls,
          createdAt: new Date()
        },
        success: res => {
          console.log('✅ 历史记录已保存', res);
        },
        fail: err => {
          console.error('❌ 保存失败 ❌', err);
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      })
      this.setData({
        imageList: urls,
        swiperKey: Date.now() // 添加动态 key 强制重新渲染
        // swiperKey: Date.now() 
      });

      
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '部分图片生成失败', icon: 'none' });
    });
  },

  generateImage(promptText) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
        method: 'POST',
        timeout: 30000,
        header: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer cae5d8c2-cd63-463c-8986-f5cb3f1c3ece'
        },
        data: {
          model: 'doubao-seedream-3-0-t2i-250415',
          prompt: promptText,
          response_format: 'url',
          size: '512x512',
          guidance_scale: 2.5,
          watermark: true
        },
        success: (res) => {
          console.log('请求成功，返回数据：', res);

          
          const url = res.data?.data?.[0]?.url;
          url ? resolve(url) : reject('无效URL');
        },
        fail: (err) => {
          console.error('图像生成失败：', err);
          reject(err);
        }
      });
    });
  },

  onImageTap(e) {
    const imageUrl = e.currentTarget.dataset.url;
    wx.showActionSheet({
      itemList: ['保存图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.saveImage(imageUrl);
        }
      }
    });
  },

  saveImage(url) {
    const db = wx.cloud.database();
    // 保存到数据库
    db.collection('history').add({
      data: {
        inputText: this.data.userInput || '', // 你可以使用用户输入的数据
        images: url,
        createdAt: new Date()  // 保存当前时间
      },
      success: res => {
        console.log('保存成功', res);
        this.setData({
          imageList: [...this.data.imageList, url], // 更新本地的 imageList 数据
          swiperKey: Date.now() // 更新 swiperKey 强制重新渲染
        });
      },
      fail: err => {
        console.error('保存失败', err);
        wx.showToast({ title: '保存失败', icon: 'none' });
      }
    });
  }
  
});