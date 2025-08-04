// 弹窗脚本
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadStats();
  await loadWordbook();
  bindEvents();
});

// 加载设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['settings']);
    const settings = result.settings || {};
    
    // 应用设置到界面
    document.getElementById('translationEngine').value = settings.translationEngine || 'deepl';
    document.getElementById('deeplApiKey').value = settings.deeplApiKey || '';
    document.getElementById('autoTranslate').checked = settings.autoTranslate !== false;
    document.getElementById('showPhonetic').checked = settings.showPhonetic !== false;
    document.getElementById('theme').value = settings.theme || 'dark';
    document.getElementById('panelPosition').value = settings.panelPosition || 'right';
    
    // 显示/隐藏API密钥输入框
    toggleApiKeyVisibility();
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 切换API密钥输入框显示
function toggleApiKeyVisibility() {
  const engine = document.getElementById('translationEngine').value;
  const apiKeyGroup = document.getElementById('deeplApiKeyGroup');
  
  if (engine === 'deepl') {
    apiKeyGroup.style.display = 'block';
  } else {
    apiKeyGroup.style.display = 'none';
  }
}

// 加载统计数据
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['wordbook']);
    const wordbook = result.wordbook || [];
    
    // 总单词数
    document.getElementById('totalWords').textContent = wordbook.length;
    
    // 今日新增单词数
    const today = new Date().toDateString();
    const todayWords = wordbook.filter(word => {
      const addedDate = new Date(word.addedAt).toDateString();
      return addedDate === today;
    });
    document.getElementById('todayWords').textContent = todayWords.length;
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

// 加载生词本预览
async function loadWordbook() {
  try {
    const result = await chrome.storage.local.get(['wordbook']);
    const wordbook = result.wordbook || [];
    const preview = document.getElementById('wordbookPreview');
    
    if (wordbook.length === 0) {
      preview.innerHTML = '<div class="empty-state">暂无收藏的单词</div>';
      return;
    }
    
    // 显示最近的10个单词
    const recentWords = wordbook
      .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
      .slice(0, 10);
    
    preview.innerHTML = recentWords.map(word => `
      <div class="word-item">
        <span class="word-text">${word.word}</span>
        <span class="word-date">${formatDate(word.addedAt)}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('加载生词本失败:', error);
  }
}

// 绑定事件
function bindEvents() {
  // 保存设置
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  
  // 导出生词本
  document.getElementById('exportWordbook').addEventListener('click', exportWordbook);
  
  // 翻译引擎变更时切换API密钥输入框
  document.getElementById('translationEngine').addEventListener('change', toggleApiKeyVisibility);
  
  // 设置变更时自动保存
  const settingInputs = ['translationEngine', 'deeplApiKey', 'autoTranslate', 'showPhonetic', 'theme', 'panelPosition'];
  settingInputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', autoSaveSettings);
    }
  });
}

// 保存设置
async function saveSettings() {
  try {
    const settings = {
      translationEngine: document.getElementById('translationEngine').value,
      deeplApiKey: document.getElementById('deeplApiKey').value,
      autoTranslate: document.getElementById('autoTranslate').checked,
      showPhonetic: document.getElementById('showPhonetic').checked,
      theme: document.getElementById('theme').value,
      panelPosition: document.getElementById('panelPosition').value
    };
    
    await chrome.storage.local.set({ settings });
    
    // 显示保存成功提示
    showMessage('设置已保存');
    
  } catch (error) {
    console.error('保存设置失败:', error);
    showMessage('保存失败，请重试', 'error');
  }
}

// 自动保存设置
async function autoSaveSettings() {
  await saveSettings();
}

// 导出生词本
async function exportWordbook() {
  try {
    const result = await chrome.storage.local.get(['wordbook']);
    const wordbook = result.wordbook || [];
    
    if (wordbook.length === 0) {
      showMessage('生词本为空，无法导出', 'warning');
      return;
    }
    
    // 准备导出数据
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      totalWords: wordbook.length,
      words: wordbook.map(word => ({
        word: word.word,
        definition: word.definition,
        addedAt: word.addedAt,
        reviewCount: word.reviewCount || 0
      }))
    };
    
    // 创建下载链接
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    
    // 触发下载
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-translator-wordbook-${formatDateForFilename(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('生词本导出成功');
    
  } catch (error) {
    console.error('导出生词本失败:', error);
    showMessage('导出失败，请重试', 'error');
  }
}

// 显示消息提示
function showMessage(message, type = 'success') {
  // 创建消息元素
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 6px;
    color: white;
    font-size: 14px;
    z-index: 1000;
    animation: slideDown 0.3s ease;
    background: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#28a745'};
  `;
  
  document.body.appendChild(messageEl);
  
  // 3秒后自动移除
  setTimeout(() => {
    if (messageEl.parentNode) {
      messageEl.remove();
    }
  }, 3000);
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return '今天';
  } else if (diffDays === 2) {
    return '昨天';
  } else if (diffDays <= 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

// 格式化文件名日期
function formatDateForFilename(date) {
  return date.toISOString().split('T')[0];
}

// 添加样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
`;
document.head.appendChild(style);