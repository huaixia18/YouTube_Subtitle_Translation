// 后台服务脚本
chrome.runtime.onInstalled.addListener(() => {
  console.log('YouTube翻译插件已安装');
  
  // 初始化默认设置
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      const defaultSettings = {
        translationEngine: 'deepl',
        deeplApiKey: '',
        autoTranslate: true,
        showPhonetic: true,
        theme: 'dark',
        panelPosition: 'right',
        shortcuts: {
          togglePanel: 'Ctrl+T',
          addToWordbook: 'Ctrl+D'
        }
      };
      
      chrome.storage.local.set({ settings: defaultSettings });
    }
  });
  
  // 创建右键菜单
  chrome.contextMenus.create({
    id: 'translateSelection',
    title: '翻译选中文本',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'addToWordbook',
    title: '添加到生词本',
    contexts: ['selection']
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'translate':
      handleTranslation(request.text, request.targetLang)
        .then(result => sendResponse({ success: true, translation: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持消息通道开放
      
    case 'getWordDefinition':
      fetchWordDefinition(request.word)
        .then(result => sendResponse({ success: true, definition: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'saveToWordbook':
      saveWordToWordbook(request.word, request.definition)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// 翻译功能
async function handleTranslation(text, targetLang = 'zh') {
  try {
    // 获取用户设置
    const settings = await getSettings();
    const engine = settings.translationEngine || 'deepl';
    
    switch (engine) {
      case 'deepl':
        return await translateWithDeepL(text, targetLang);
      case 'google':
        return await translateWithGoogle(text, targetLang);
      default:
        return await translateWithDeepL(text, targetLang);
    }
  } catch (error) {
    console.error('翻译失败:', error);
    throw error;
  }
}

// DeepL翻译
async function translateWithDeepL(text, targetLang) {
  try {
    // 获取API密钥
    const settings = await getSettings();
    const apiKey = settings.deeplApiKey;
    
    if (!apiKey || apiKey.trim() === '') {
      console.log('未配置DeepL API密钥，使用备用翻译方案');
      throw new Error('DeepL API密钥未配置');
    }
    
    // DeepL免费API接口
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey.trim()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'text': text,
        'source_lang': 'EN',
        'target_lang': targetLang === 'zh' ? 'ZH' : targetLang.toUpperCase()
      })
    });

    if (!response.ok) {
      console.error('DeepL API请求失败，状态码:', response.status);
      throw new Error('DeepL API请求失败，使用备用翻译');
    }

    const data = await response.json();
    
    if (data.translations && data.translations.length > 0) {
      console.log('DeepL翻译成功');
      return data.translations[0].text;
    }
    
    throw new Error('DeepL翻译响应格式错误');
  } catch (error) {
    console.error('DeepL翻译失败，使用备用方案:', error);
    // 备用方案：使用免费的翻译接口
    return await translateWithFallback(text, targetLang);
  }
}

// 备用翻译方案
async function translateWithFallback(text, targetLang) {
  try {
    // 使用百度翻译的免费接口（无需API密钥）
    const response = await fetch(`https://fanyi.baidu.com/sug?kw=${encodeURIComponent(text)}`);
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].v;
    }
    
    // 最后备用方案：使用Google翻译
    return await translateWithGoogle(text, targetLang);
  } catch (error) {
    console.error('备用翻译也失败:', error);
    return '翻译服务暂时不可用';
  }
}

// Google翻译
async function translateWithGoogle(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  
  try {
    const response = await fetch(url);
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
    console.error('Google翻译详细错误:', error);
    throw new Error('Google翻译服务不可用');
  }
}

// 百度翻译（需要API密钥）
async function translateWithBaidu(text, targetLang) {
  // 这里需要配置百度翻译API
  // 由于需要API密钥，这里提供基础框架
  throw new Error('百度翻译需要配置API密钥');
}

// 获取单词定义（中文释义）
async function fetchWordDefinition(word) {
  try {
    // 首先尝试获取英文定义，然后翻译成中文
    const englishDefinition = await fetchEnglishDefinition(word);
    
    if (englishDefinition) {
      // 翻译词性和定义到中文
      const chineseDefinition = await translateDefinitionToChinese(englishDefinition);
      return chineseDefinition;
    }
    
    // 备用方案：使用中文词典API
    return await fetchChineseDefinition(word);
    
  } catch (error) {
    console.error('获取单词定义失败:', error);
    // 返回备用定义
    return {
      word: word,
      phonetic: '',
      meanings: [{
        partOfSpeech: '未知',
        definitions: ['暂时无法获取该单词的定义，请稍后重试。']
      }]
    };
  }
}

// 获取英文定义
async function fetchEnglishDefinition(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    
    if (!response.ok) {
      throw new Error('词典API请求失败');
    }
    
    const data = await response.json();
    
    if (data && data[0]) {
      const entry = data[0];
      return {
        word: entry.word,
        phonetic: entry.phonetic || (entry.phonetics && entry.phonetics[0] && entry.phonetics[0].text) || '',
        meanings: entry.meanings.slice(0, 2).map(meaning => ({
          partOfSpeech: meaning.partOfSpeech,
          definitions: meaning.definitions.slice(0, 2).map(def => def.definition)
        }))
      };
    }
    
    throw new Error('未找到单词定义');
  } catch (error) {
    throw error;
  }
}

// 将英文定义翻译成中文
async function translateDefinitionToChinese(englishDefinition) {
  try {
    const chineseDefinition = {
      word: englishDefinition.word,
      phonetic: englishDefinition.phonetic,
      meanings: []
    };
    
    // 翻译每个词性和定义
    for (const meaning of englishDefinition.meanings) {
      const chineseMeaning = {
        partOfSpeech: await translatePartOfSpeech(meaning.partOfSpeech),
        definitions: []
      };
      
      // 翻译每个定义
      for (const definition of meaning.definitions) {
        try {
          const translatedDefinition = await handleTranslation(definition, 'zh');
          chineseMeaning.definitions.push(translatedDefinition);
        } catch (error) {
          console.error('翻译定义失败:', error);
          chineseMeaning.definitions.push(definition); // 保留英文原文
        }
      }
      
      chineseDefinition.meanings.push(chineseMeaning);
    }
    
    return chineseDefinition;
  } catch (error) {
    console.error('翻译定义到中文失败:', error);
    return englishDefinition; // 返回英文版本
  }
}

// 翻译词性
async function translatePartOfSpeech(partOfSpeech) {
  const posMap = {
    'noun': '名词',
    'verb': '动词',
    'adjective': '形容词',
    'adverb': '副词',
    'pronoun': '代词',
    'preposition': '介词',
    'conjunction': '连词',
    'interjection': '感叹词',
    'article': '冠词',
    'determiner': '限定词'
  };
  
  return posMap[partOfSpeech.toLowerCase()] || partOfSpeech;
}

// 备用：使用中文词典
async function fetchChineseDefinition(word) {
  try {
    // 使用有道词典API或其他中文词典服务
    // 这里提供一个基础框架，可以根据需要扩展
    const response = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&dicts={"count":1,"dicts":[["ec","ce"]]}`);
    
    if (response.ok) {
      const data = await response.json();
      // 解析有道词典返回的数据
      // 具体实现需要根据API文档调整
    }
    
    // 如果没有合适的中文词典API，返回基础信息
    throw new Error('中文词典API不可用');
  } catch (error) {
    // 最后的备用方案：返回基础的中文解释
    return {
      word: word,
      phonetic: '',
      meanings: [{
        partOfSpeech: '词汇',
        definitions: [`"${word}" 的中文释义暂时不可用，请稍后重试。`]
      }]
    };
  }
}

// 保存单词到生词本
async function saveWordToWordbook(word, definition) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['wordbook'], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      const wordbook = result.wordbook || [];
      
      // 检查是否已存在
      const existingIndex = wordbook.findIndex(item => item.word.toLowerCase() === word.toLowerCase());
      
      const wordEntry = {
        word,
        definition,
        addedAt: new Date().toISOString(),
        reviewCount: 0,
        lastReviewed: null
      };
      
      if (existingIndex !== -1) {
        // 更新现有条目
        wordbook[existingIndex] = { ...wordbook[existingIndex], ...wordEntry };
      } else {
        // 添加新条目
        wordbook.push(wordEntry);
      }
      
      chrome.storage.local.set({ wordbook }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  });
}

// 获取设置
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['settings'], (result) => {
      resolve(result.settings || {});
    });
  });
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
    // YouTube视频页面加载完成，可以在这里做一些初始化工作
    console.log('YouTube视频页面已加载:', tab.url);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translateSelection' && info.selectionText) {
    // 发送翻译请求到内容脚本
    chrome.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'addToWordbook' && info.selectionText) {
    // 添加选中文本到生词本
    const word = info.selectionText.trim();
    fetchWordDefinition(word)
      .then(definition => saveWordToWordbook(word, definition))
      .then(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'showMessage',
          message: `"${word}" 已添加到生词本`
        });
      })
      .catch(error => {
        console.error('添加到生词本失败:', error);
      });
  }
});