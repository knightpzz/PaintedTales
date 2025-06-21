Page({
  data: {
    userInfo: {},    // 存储用户信息
    userInput: '',
    reply: '',
    descriptionList: [], // 五段插画描述，建议从豆包返回结果中解析
    imageList: [], // 存放五张图地址
    prompt: '',
    // 新增：生成类型选择项
    typeOptions: ['生成图片', '生成视频'],
    typeIndex: 0,  // 默认“生成图片”
    generationType: 'image'  // 可选值：'image' | 'video'
  },


  onTypeChange(e) {
    const index = Number(e.detail.value);
    const type = index === 0 ? 'image' : 'video';
    this.setData({
      typeIndex: index,
      generationType: type
    });
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
    const { generationType } = this.data;

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
    this.setData({ prompt }, () => {
      this.generateContentFlow();
    });
    wx.showLoading({ title: '生成中...', mask: true });


  },
  // 内容生成流程
  generateContentFlow() {
    const prompt = this.data.prompt;
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
          const paragraphs = story
            .split(/\n{2,}|\r\n\r\n/)
            .map(p => p.trim())
            .filter(p => p.length > 10)
            .slice(0, 5); // 最多5段

          if (paragraphs.length === 0) {
            wx.showToast({ title: '童话分段失败', icon: 'none' });
            return;
          }
          this.setData({ descriptionList: paragraphs });


          if (this.data.generationType === 'image') {
            this.generateIllustrationFlow(); // 自定义图片生成功能
          } else if (this.data.generationType === 'video') {
            this.generateVideoFlow(); // 自定义视频生成功能
          }

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
  // 图片生成流程
  generateIllustrationFlow() {
    wx.showLoading({ title: '生成插画中...' });
    const promises = this.data.descriptionList.map(desc => this.generateImage(desc));
    Promise.all(promises).then(urls => {
      wx.hideLoading();
      console.log('图片数组:', urls);

      this.saveGenerationHistory('image', urls);

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

  // 视频生成流程（占位逻辑）
  generateVideoFlow() {
    wx.showLoading({ title: '生成视频中...' });

    const promptText = this.data.descriptionList.join('\n');
    const videoPrompt = `多个镜头。${promptText} --ration 16:9 --resolution 480p --duration 5 --framepersecond 16 --watermark false`;

    wx.request({
      url: 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks',
      method: 'POST',
      timeout: 30000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer cae5d8c2-cd63-463c-8986-f5cb3f1c3ece'
      },
      data: {
        model: 'doubao-seedance-1-0-pro-250528',
        content: [
          {
            type: 'text',
            text: videoPrompt
          }
        ]
      },
      success: (res) => {
        wx.hideLoading();
        const taskId = res.data?.id;
        console.log('视频生成返回原始数据:', res);
        if (taskId) {
          console.log('🎬 视频生成任务提交成功，任务ID:', taskId);
          wx.showToast({ title: '视频生成中，请稍后查看', icon: 'none' });

          // ⭐ 可以把 taskId 存下来，稍后轮询获取视频地址
          this.pollVideoResult(taskId);
        } else {
          wx.showToast({ title: '任务提交失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.log('视频生成返回数据：', err.data);
        wx.hideLoading();
        console.error('视频生成请求失败：', err);
        wx.showToast({ title: '视频生成失败', icon: 'none' });
      }
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
          size: '768x512',
          guidance_scale: 2.5,
          watermark: false
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
  pollVideoResult(taskId) {
    const checkUrl = `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`;
    let retryCount = 0;
    const maxRetries = 20; // 最多轮询20次，大约1分40秒

    const interval = setInterval(() => {
      if (retryCount >= maxRetries) {
        clearInterval(interval);
        wx.hideLoading();
        wx.showToast({ title: '超时未完成', icon: 'none' });
        console.warn('轮询超时');
        return;
      }

      retryCount++;

      wx.request({
        url: checkUrl,
        method: 'GET',
        header: {
          'Authorization': 'Bearer cae5d8c2-cd63-463c-8986-f5cb3f1c3ece'
        },
        success: (res) => {
          console.log(`第${retryCount}次轮询：`, res.data);

          const status = res.data?.status;
          if (status === 'succeeded') {
            clearInterval(interval);
            const videoUrl = res.data?.result?.videos?.[0]?.url;
            if (videoUrl) {
              console.log('✅ 视频地址：', videoUrl);
              wx.navigateTo({
                url: `/pages/videoPreview/videoPreview?videoUrl=${encodeURIComponent(videoUrl)}`
              });
              this.saveGenerationHistory('video', videoUrl);
            } else {
              wx.showToast({ title: '未获取到视频地址', icon: 'none' });
            }
          } else if (status === 'failed') {
            clearInterval(interval);
            wx.showToast({ title: '视频生成失败', icon: 'none' });
          } else {
            console.log(`⏳ 视频状态：${status}`);
          }
        },
        fail: (err) => {
          clearInterval(interval);
          console.error('视频状态获取失败：', err);
          wx.showToast({ title: '状态获取失败', icon: 'none' });
        }
      });
    }, 5000);
  },


  saveGenerationHistory(type, data) {
    const db = wx.cloud.database();
    // 格式化日期为 'YYYY-MM-DD HH:MM:SS' 格式
    const now = new Date().toLocaleString();

    const historyRecord = {
      inputText: this.data.userInput || '',
      createdAt: now,
      type // 'image' 或 'video'
    };

    if (type === 'image') {
      historyRecord.images = data; // 传入的是图片URL数组
    } else if (type === 'video') {
      historyRecord.videoUrl = data; // 传入的是视频URL字符串
    } else {
      console.warn('⚠️ 未知的历史记录类型');
      return;
    }

    db.collection('history').add({
      data: historyRecord,
      success: res => {
        console.log('✅ 历史记录已保存', res);
      },
      fail: err => {
        console.error('❌ 保存历史记录失败 ❌', err);
        wx.showToast({ title: '历史记录保存失败', icon: 'none' });
      }
    });
  },


});