// YouTube字幕提取和翻译内容脚本
class YouTubeTranslator {
  constructor() {
    this.isActive = false;
    this.translationPanel = null;
    this.currentSubtitles = [];
    this.observer = null;
    this.init();
  }

  init() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  start() {
    console.log('YouTube翻译插件已启动');
    
    // 检查是否在YouTube视频页面
    if (!this.isYouTubeVideoPage()) return;
    
    // 创建翻译面板
    this.createTranslationPanel();
    
    // 开始监听字幕变化
    this.startSubtitleObserver();
    
    // 添加单词点击事件监听
    this.addWordClickListener();
    
    // 监听键盘快捷键
    this.addKeyboardListener();
  }

  isYouTubeVideoPage() {
    return window.location.pathname === '/watch' && window.location.search.includes('v=');
  }

  createTranslationPanel() {
    // 创建翻译面板容器
    this.translationPanel = document.createElement('div');
    this.translationPanel.id = 'yt-translation-panel';
    this.translationPanel.className = 'yt-translation-panel';
    
    this.translationPanel.innerHTML = `
      <div class="panel-header">
        <span class="panel-title">字幕翻译</span>
        <div class="panel-controls">
          <button id="toggle-pin" class="control-btn" title="固定面板">📌</button>
          <button id="toggle-minimize" class="control-btn" title="最小化">➖</button>
          <button id="toggle-close" class="control-btn" title="关闭">✖️</button>
        </div>
      </div>
      <div class="panel-content">
        <div class="subtitle-container">
          <div class="original-text" id="original-text">等待字幕加载...</div>
          <div class="translated-text" id="translated-text">翻译将在这里显示</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.translationPanel);
    this.makeDraggable();
    this.addPanelEventListeners();
  }

  makeDraggable() {
    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    
    const header = this.translationPanel.querySelector('.panel-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('control-btn')) return;
      
      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
      
      if (e.target === header || header.contains(e.target)) {
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
      }
    });
    
    const dragMove = (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        this.translationPanel.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    };
    
    const dragEnd = () => {
      isDragging = false;
      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('mouseup', dragEnd);
    };
  }

  addPanelEventListeners() {
    // 关闭按钮
    document.getElementById('toggle-close').addEventListener('click', () => {
      this.translationPanel.style.display = 'none';
    });
    
    // 最小化按钮
    document.getElementById('toggle-minimize').addEventListener('click', () => {
      const content = this.translationPanel.querySelector('.panel-content');
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
    
    // 固定按钮
    document.getElementById('toggle-pin').addEventListener('click', (e) => {
      this.translationPanel.classList.toggle('pinned');
      e.target.textContent = this.translationPanel.classList.contains('pinned') ? '📍' : '📌';
    });
  }

  startSubtitleObserver() {
    // 监听YouTube字幕容器
    const subtitleSelector = '.caption-window, .ytp-caption-window-container, [class*="caption"]';
    
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          this.extractSubtitles();
        }
      });
    });
    
    // 开始观察
    const targetNode = document.querySelector('#movie_player') || document.body;
    this.observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // 立即尝试提取一次字幕
    setTimeout(() => this.extractSubtitles(), 2000);
  }

  extractSubtitles() {
    // 尝试多种YouTube字幕选择器
    const selectors = [
      '.caption-window .captions-text',
      '.ytp-caption-window-container .captions-text',
      '.caption-visual-line',
      '[class*="caption"] span',
      '.ytp-caption-segment'
    ];
    
    let subtitleText = '';
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        subtitleText = Array.from(elements)
          .map(el => el.textContent.trim())
          .filter(text => text.length > 0)
          .join(' ');
        break;
      }
    }
    
    if (subtitleText && subtitleText !== this.currentSubtitleText) {
      this.currentSubtitleText = subtitleText;
      this.updateSubtitleDisplay(subtitleText);
      this.translateText(subtitleText);
    }
  }

  updateSubtitleDisplay(text) {
    console.log('更新字幕显示:', text);
    const originalTextEl = document.getElementById('original-text');
    if (originalTextEl) {
      const highlightedText = this.highlightWords(text);
      console.log('高亮后的文本:', highlightedText);
      originalTextEl.innerHTML = highlightedText;
    }
  }

  highlightWords(text) {
    // 将英文单词包装在span中，便于点击选择
    return text.replace(/\b[a-zA-Z]+\b/g, '<span class="clickable-word">$&</span>');
  }

  async translateText(text) {
    try {
      const translatedText = await this.callTranslationAPI(text);
      const translatedTextEl = document.getElementById('translated-text');
      if (translatedTextEl) {
        translatedTextEl.textContent = translatedText;
      }
    } catch (error) {
      console.error('翻译失败:', error);
      const translatedTextEl = document.getElementById('translated-text');
      if (translatedTextEl) {
        translatedTextEl.textContent = '翻译失败，请稍后重试';
      }
    }
  }

  async callTranslationAPI(text) {
    try {
      // 使用后台脚本进行翻译
      const response = await chrome.runtime.sendMessage({
        action: 'translate',
        text: text,
        targetLang: 'zh'
      });
      
      if (response && response.success) {
        return response.translation;
      } else {
        throw new Error(response.error || '翻译服务响应错误');
      }
    } catch (error) {
      console.error('调用翻译API失败:', error);
      // 备用翻译方案：直接调用Google翻译
      return await this.fallbackTranslation(text);
    }
  }

  async fallbackTranslation(text) {
    try {
      const response = await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh&dt=t&q=' + encodeURIComponent(text));
      const data = await response.json();
      
      if (data && data[0] && Array.isArray(data[0])) {
        // 合并所有翻译片段
        let translatedText = '';
        for (const segment of data[0]) {
          if (segment && segment[0]) {
            translatedText += segment[0];
          }
        }
        return translatedText.trim();
      }
      
      throw new Error('翻译响应格式错误');
    } catch (error) {
      console.error('备用翻译失败:', error);
      return '翻译服务暂时不可用';
    }
  }

  addWordClickListener() {
    console.log('添加单词点击监听器');
    document.addEventListener('click', (e) => {
      console.log('点击事件触发:', e.target);
      if (e.target.classList.contains('clickable-word')) {
        console.log('点击了可点击单词:', e.target.textContent);
        const word = e.target.textContent.trim();
        this.showWordDefinition(word, e.pageX, e.pageY);
      }
    });
  }

  showWordDefinition(word, x, y) {
    // 移除已存在的定义弹窗
    const existingPopup = document.querySelector('.word-definition-popup');
    if (existingPopup) {
      existingPopup.remove();
    }
    
    // 创建单词定义弹窗
    const popup = document.createElement('div');
    popup.className = 'word-definition-popup';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    
    popup.innerHTML = `
      <div class="word-header">
        <span class="word-text">${word}</span>
        <button class="close-btn">×</button>
      </div>
      <div class="word-content">
        <div class="loading">加载中...</div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    // 关闭按钮事件
    popup.querySelector('.close-btn').addEventListener('click', () => {
      popup.remove();
    });
    
    // 点击其他地方关闭
    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
    
    // 获取单词定义
    this.fetchWordDefinition(word, popup);
  }

  async fetchWordDefinition(word, popup) {
    try {
      // 调用后台脚本获取单词定义
      const response = await chrome.runtime.sendMessage({
        action: 'getWordDefinition',
        word: word
      });
      
      let definition;
      if (response && response.success) {
        definition = response.definition;
      } else {
        // 使用备用定义
        definition = {
          word: word,
          phonetic: '',
          meanings: [{
            partOfSpeech: 'unknown',
            definitions: ['暂时无法获取该单词的定义，请稍后重试。']
          }]
        };
      }
      
      const content = popup.querySelector('.word-content');
      content.innerHTML = `
        <div class="phonetic">${definition.phonetic || ''}</div>
        <div class="meanings">
          ${definition.meanings.map(meaning => `
            <div class="meaning">
              <span class="part-of-speech">${meaning.partOfSpeech || 'unknown'}</span>
              <div class="definitions">
                ${meaning.definitions.map(def => `<p>${def}</p>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>
        <button class="add-to-wordbook">添加到生词本</button>
      `;
      
      // 添加到生词本功能
      popup.querySelector('.add-to-wordbook').addEventListener('click', () => {
        this.addToWordbook(word, definition);
      });
      
    } catch (error) {
      console.error('获取单词定义失败:', error);
      popup.querySelector('.word-content').innerHTML = '<div class="error">获取定义失败，请稍后重试</div>';
    }
  }

  async addToWordbook(word, definition) {
    console.log('尝试添加单词到生词本:', word, definition);
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'saveToWordbook',
        word: word,
        definition: definition
      });
      
      console.log('后台脚本响应:', response);
      
      if (response && response.success) {
        // 显示成功提示
        console.log('显示成功提示');
        this.showMessage(`"${word}" 已添加到生词本`, 'success');
      } else {
        console.log('保存失败:', response);
        this.showMessage('添加到生词本失败', 'error');
      }
    } catch (error) {
      console.error('添加到生词本失败:', error);
      this.showMessage('添加到生词本失败', 'error');
    }
  }

  showMessage(message, type = 'success') {
    console.log('显示消息:', message, type);
    
    // 移除已存在的消息
    const existingMessage = document.querySelector('.yt-translate-message');
    if (existingMessage) {
      existingMessage.remove();
    }
    
    // 创建临时提示消息
    const messageEl = document.createElement('div');
    messageEl.className = `yt-translate-message message-${type}`;
    messageEl.textContent = message;
    
    // 使用内联样式确保显示
    const bgColor = type === 'error' ? '#dc3545' : '#28a745';
    messageEl.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      padding: 12px 20px !important;
      border-radius: 6px !important;
      color: white !important;
      font-size: 14px !important;
      z-index: 99999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
      background: ${bgColor} !important;
      font-weight: 500 !important;
      pointer-events: auto !important;
    `;
    
    document.body.appendChild(messageEl);
    console.log('消息元素已添加到DOM:', messageEl);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
        console.log('消息已自动移除');
      }
    }, 3000);
  }

  addKeyboardListener() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+T 切换翻译面板显示
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        if (this.translationPanel) {
          const isVisible = this.translationPanel.style.display !== 'none';
          this.translationPanel.style.display = isVisible ? 'none' : 'block';
        }
      }
      
      // Esc 关闭单词弹窗
      if (e.key === 'Escape') {
        const popup = document.querySelector('.word-definition-popup');
        if (popup) {
          popup.remove();
        }
      }
    });
  }
}

// 初始化翻译器
new YouTubeTranslator();