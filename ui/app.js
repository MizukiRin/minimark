/**
 * MiniMark - 极简 Markdown 编辑与查看器 前端核心逻辑
 */

// 国际化多语言词条表
const I18N = {
  zh: {
    brand: "MiniMark",
    workspace: "工作区",
    openFolder: "打开工作区文件夹 (Ctrl+K Ctrl+O)",
    openFile: "打开文件 (Ctrl+O)",
    newFile: "新建临时文件 (Ctrl+N)",
    openFolderAction: "打开文件夹",
    openFileAction: "打开文件",
    newFileAction: "新建文件",
    saveFile: "保存文件 (Ctrl+S)",
    saveAsFile: "另存为 (Ctrl+Shift+S)",
    search: "搜索 (Ctrl+F)",
    replace: "查找与替换 (Ctrl+H)",
    theme: "切换主题",
    lang: "English",
    toggleSidebar: "展开/折叠侧边栏 (Ctrl+B)",
    modeEdit: "仅编辑",
    modeSplit: "双栏",
    modePreview: "仅查看",
    untitled: "未命名.md",
    tempTag: "临时",
    homeSubtitle: "极简、专注的 Markdown 编辑与查看器",
    recentFolders: "最近打开的文件夹",
    recentFiles: "最近打开的文件",
    noRecentFolders: "暂无最近打开的文件夹",
    noRecentFiles: "暂无最近打开的文件",
    searchPlaceholder: "在当前文档中搜索...",
    replacePlaceholder: "替换为...",
    findNext: "下一个",
    findPrev: "上一个",
    replaceOne: "替换",
    replaceAll: "全部替换",
    saveConfirmTitle: "未保存提示",
    cancel: "取消",
    save: "保存",
    dontSave: "不保存",
    closedWithoutSaving: "已关闭（未保存更改）",
    ctxNewFile: "新建文件",
    ctxNewFolder: "新建文件夹",
    ctxRename: "重命名",
    ctxDelete: "删除",
    ctxReveal: "在资源管理器中打开",
    statusLines: "行",
    statusWords: "字",
    statusChars: "字符",
    statusMode: "模式",
    copyCode: "复制",
    copied: "已复制",
    unsupportedFile: "不支持打开此类格式文件（仅支持 Markdown / 文本文件）",
    confirmDelete: "确定要删除该项吗？此操作无法撤销。"
  },
  en: {
    brand: "MiniMark",
    workspace: "WORKSPACE",
    openFolder: "Open Workspace Folder (Ctrl+K Ctrl+O)",
    openFile: "Open File (Ctrl+O)",
    newFile: "New Temporary File (Ctrl+N)",
    openFolderAction: "Open Folder",
    openFileAction: "Open File",
    newFileAction: "New File",
    saveFile: "Save (Ctrl+S)",
    saveAsFile: "Save As (Ctrl+Shift+S)",
    search: "Search (Ctrl+F)",
    replace: "Search & Replace (Ctrl+H)",
    theme: "Toggle Theme",
    lang: "简体中文",
    toggleSidebar: "Toggle Sidebar (Ctrl+B)",
    modeEdit: "Edit Only",
    modeSplit: "Split",
    modePreview: "Preview",
    untitled: "Untitled.md",
    tempTag: "Draft",
    homeSubtitle: "Minimalist, Distraction-Free Markdown Editor & Viewer",
    recentFolders: "Recent Folders",
    recentFiles: "Recent Files",
    noRecentFolders: "No recent folders",
    noRecentFiles: "No recent files",
    searchPlaceholder: "Search in document...",
    replacePlaceholder: "Replace with...",
    findNext: "Next",
    findPrev: "Prev",
    replaceOne: "Replace",
    replaceAll: "Replace All",
    saveConfirmTitle: "Unsaved Changes",
    cancel: "Cancel",
    save: "Save",
    dontSave: "Don't Save",
    closedWithoutSaving: "Closed without saving",
    ctxNewFile: "New File",
    ctxNewFolder: "New Folder",
    ctxRename: "Rename",
    ctxDelete: "Delete",
    ctxReveal: "Reveal in File Explorer",
    statusLines: "Lines",
    statusWords: "Words",
    statusChars: "Chars",
    statusMode: "Mode",
    copyCode: "Copy",
    copied: "Copied",
    unsupportedFile: "Unsupported file format (Only Markdown / Text files are supported)",
    confirmDelete: "Are you sure you want to delete this item? This action cannot be undone."
  }
};

const SUPPORTED_EXTENSIONS = [".md", ".markdown", ".mdown", ".mkd", ".txt", ""];

class MiniMarkApp {
  constructor() {
    this.backend = null;
    this.lang = "zh";
    this.theme = "light";
    this.mode = "preview"; // 默认全局仅查看模式
    this.isCapsuleExpanded = false;
    this.isSidebarCollapsed = false;

    // 标签页状态
    this.tabs = [];
    this.activeTabId = null;
    this.nextTabId = 1;
    this.pendingCloseTab = null;

    // 工作区状态
    this.workspaceData = null;
    this.contextTarget = null;

    // 最近记录
    this.recentFolders = this.loadRecentFolders();
    this.recentFiles = this.loadRecentFiles();

    // 搜索高亮与导航状态
    this.searchState = {
      query: "",
      previewMarks: [],
      editorMatchIndices: [],
      currentIndex: -1
    };

    // 滚动同步标志
    this.isSyncingScroll = false;

    // DOM 元素引用
    this.dom = {
      titlebar: document.getElementById("titlebar"),
      tabsContainer: document.getElementById("tabs-container"),
      sidebar: document.getElementById("sidebar"),
      fileTree: document.getElementById("file-tree"),
      workspaceTitle: document.getElementById("workspace-title"),
      homeDashboard: document.getElementById("home-dashboard"),
      recentFoldersList: document.getElementById("recent-folders-list"),
      recentFilesList: document.getElementById("recent-files-list"),
      contentPanes: document.getElementById("content-panes"),
      searchPanel: document.getElementById("search-panel"),
      searchInput: document.getElementById("search-input"),
      replaceRow: document.getElementById("replace-row"),
      replaceInput: document.getElementById("replace-input"),
      searchCount: document.getElementById("search-count"),
      modeCapsule: document.getElementById("mode-capsule"),
      capsuleCurrentIcon: document.getElementById("capsule-current-icon"),
      btnModeEdit: document.getElementById("btn-mode-edit"),
      btnModeSplit: document.getElementById("btn-mode-split"),
      btnModePreview: document.getElementById("btn-mode-preview"),
      editorContainer: document.getElementById("editor-container"),
      editorTextarea: document.getElementById("editor-textarea"),
      panesSplitter: document.getElementById("panes-splitter"),
      previewContainer: document.getElementById("preview-container"),
      previewContent: document.getElementById("preview-content"),
      toastContainer: document.getElementById("toast-container"),
      saveConfirmModal: document.getElementById("save-confirm-modal"),
      saveConfirmMessage: document.getElementById("save-confirm-message"),
      contextMenu: document.getElementById("context-menu"),
      statusPath: document.getElementById("status-path"),
      statusEncoding: document.getElementById("status-encoding"),
      statusStats: document.getElementById("status-stats"),
      statusMode: document.getElementById("status-mode"),
      btnLang: document.getElementById("btn-lang"),
      btnTheme: document.getElementById("btn-theme")
    };

    this.init();
  }

  async init() {
    this.initMermaid();
    this.initQWebChannel();
    this.initEventListeners();
    this.initShortcuts();

    // 默认展示 README 演示文档
    this.createWelcomeTab();

    this.setMode("preview");
    this.updateI18n();
  }

  initMermaid() {
    if (window.mermaid) {
      mermaid.initialize({
        startOnLoad: false,
        theme: this.theme === "dark" ? "dark" : "default",
        securityLevel: "loose"
      });
    }
  }

  initQWebChannel() {
    if (typeof qt !== "undefined" && qt.webChannelTransport) {
      new QWebChannel(qt.webChannelTransport, (channel) => {
        this.backend = channel.objects.backend;
        window.backend = this.backend;

        // 获取系统语言与深浅主题
        this.backend.get_system_theme((sysTheme) => {
          this.setTheme(sysTheme || "light");
        });
        this.backend.get_system_locale((sysLocale) => {
          this.lang = sysLocale === "zh" ? "zh" : "en";
          this.updateI18n();
        });

        // 监听系统主题变化信号
        this.backend.themeChanged.connect((newTheme) => {
          this.setTheme(newTheme);
        });
      });
    } else {
      console.log("Running in standalone browser mode.");
      this.detectBrowserTheme();
    }
  }

  detectBrowserTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      this.setTheme("dark");
    } else {
      this.setTheme("light");
    }
  }

  // ==================== 最近记录存储 ====================

  loadRecentFolders() {
    try {
      return JSON.parse(localStorage.getItem("minimark_recent_folders") || "[]");
    } catch {
      return [];
    }
  }

  saveRecentFolders() {
    try {
      localStorage.setItem("minimark_recent_folders", JSON.stringify(this.recentFolders.slice(0, 8)));
    } catch {}
  }

  addRecentFolder(path, name) {
    if (!path) return;
    this.recentFolders = this.recentFolders.filter(f => f.path !== path);
    this.recentFolders.unshift({ path, name: name || path.split(/[/\\]/).pop() || path, time: Date.now() });
    this.saveRecentFolders();
  }

  loadRecentFiles() {
    try {
      return JSON.parse(localStorage.getItem("minimark_recent_files") || "[]");
    } catch {
      return [];
    }
  }

  saveRecentFiles() {
    try {
      localStorage.setItem("minimark_recent_files", JSON.stringify(this.recentFiles.slice(0, 8)));
    } catch {}
  }

  addRecentFile(path, name) {
    if (!path) return;
    this.recentFiles = this.recentFiles.filter(f => f.path !== path);
    this.recentFiles.unshift({ path, name: name || path.split(/[/\\]/).pop() || path, time: Date.now() });
    this.saveRecentFiles();
  }

  // ==================== 主页 Dashboard 渲染 ====================

  showHomeDashboard() {
    this.activeTabId = null;
    this.dom.contentPanes.style.display = "none";
    this.dom.modeCapsule.style.display = "none";
    this.dom.searchPanel.style.display = "none";
    this.dom.homeDashboard.style.display = "flex";

    this.renderTabs();
    this.renderFileTree();
    this.renderHomeRecents();
    this.updateStatusBar();

    if (this.backend && this.backend.set_window_title) {
      this.backend.set_window_title("");
    }
  }

  hideHomeDashboard() {
    this.dom.homeDashboard.style.display = "none";
    this.dom.contentPanes.style.display = "flex";
    this.dom.modeCapsule.style.display = "flex";
  }

  renderHomeRecents() {
    const t = I18N[this.lang];
    const foldersEl = this.dom.recentFoldersList;
    const filesEl = this.dom.recentFilesList;

    // 渲染最近文件夹
    foldersEl.innerHTML = "";
    if (this.recentFolders.length === 0) {
      foldersEl.innerHTML = `<div class="recent-empty">${t.noRecentFolders}</div>`;
    } else {
      this.recentFolders.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "recent-item";
        itemEl.innerHTML = `
          <span class="recent-item-name">📁 ${item.name}</span>
          <span class="recent-item-path">${item.path}</span>
        `;
        itemEl.onclick = () => {
          this.loadWorkspace(item.path);
        };
        foldersEl.appendChild(itemEl);
      });
    }

    // 渲染最近文件
    filesEl.innerHTML = "";
    if (this.recentFiles.length === 0) {
      filesEl.innerHTML = `<div class="recent-empty">${t.noRecentFiles}</div>`;
    } else {
      this.recentFiles.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "recent-item";
        itemEl.innerHTML = `
          <span class="recent-item-name">📄 ${item.name}</span>
          <span class="recent-item-path">${item.path}</span>
        `;
        itemEl.onclick = () => {
          this.openFileByPath(item.path, item.name);
        };
        filesEl.appendChild(itemEl);
      });
    }
  }

  // ==================== 提示通知组件 (Toast) ====================

  showToast(message, type = "info", duration = 2800) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let iconSvg = "";
    if (type === "warning" || type === "error") {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="${type === 'error' ? '#ef4444' : '#f59e0b'}"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="var(--primary)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "opacity 0.2s, transform 0.2s";
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }

  // ==================== 视图模式与悬浮胶囊 ====================

  setMode(mode, e) {
    if (e) e.stopPropagation();
    this.mode = mode;

    this.dom.btnModeEdit.classList.toggle("active", mode === "edit");
    this.dom.btnModeSplit.classList.toggle("active", mode === "split");
    this.dom.btnModePreview.classList.toggle("active", mode === "preview");

    if (mode === "edit") {
      this.dom.editorContainer.style.display = "flex";
      this.dom.panesSplitter.style.display = "none";
      this.dom.previewContainer.style.display = "none";
      this.dom.capsuleCurrentIcon.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
        </svg>
      `;
    } else if (mode === "split") {
      this.dom.editorContainer.style.display = "flex";
      this.dom.panesSplitter.style.display = "block";
      this.dom.previewContainer.style.display = "block";
      this.dom.capsuleCurrentIcon.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>
        </svg>
      `;
      this.renderCurrentMarkdown();
    } else { // preview
      this.dom.editorContainer.style.display = "none";
      this.dom.panesSplitter.style.display = "none";
      this.dom.previewContainer.style.display = "block";
      this.dom.capsuleCurrentIcon.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      `;
      this.renderCurrentMarkdown();
    }

    this.closeCapsule();
    this.updateStatusBar();
  }

  toggleCapsule(e) {
    if (e) e.stopPropagation();
    this.isCapsuleExpanded = !this.isCapsuleExpanded;
    this.dom.modeCapsule.classList.toggle("expanded", this.isCapsuleExpanded);
  }

  closeCapsule() {
    this.isCapsuleExpanded = false;
    this.dom.modeCapsule.classList.remove("expanded");
  }

  // ==================== 主题与多语言 ====================

  setTheme(theme) {
    this.theme = theme;
    document.body.setAttribute("data-theme", theme);
    if (window.mermaid) {
      mermaid.initialize({
        theme: theme === "dark" ? "dark" : "default"
      });
      this.renderCurrentMarkdown();
    }
  }

  toggleTheme() {
    const nextTheme = this.theme === "light" ? "dark" : "light";
    this.setTheme(nextTheme);
  }

  toggleLang() {
    this.lang = this.lang === "zh" ? "en" : "zh";
    this.updateI18n();
  }

  updateI18n() {
    const t = I18N[this.lang];
    this.dom.btnLang.title = t.theme;
    this.dom.btnTheme.title = t.theme;
    this.dom.workspaceTitle.innerText = this.workspaceData ? (this.workspaceData.name || t.workspace) : t.workspace;

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (t[key]) el.innerText = t[key];
    });

    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      if (t[key]) el.title = t[key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (t[key]) el.placeholder = t[key];
    });

    this.renderFileTree();
    this.renderHomeRecents();
    this.updateStatusBar();
  }

  // ==================== 标签页与工作区临时文件管理 ====================

  createTab(name, content, path = null, isUntitled = false) {
    const tabId = "tab_" + (this.nextTabId++);
    const tab = {
      id: tabId,
      name: name || I18N[this.lang].untitled,
      content: content || "",
      originalContent: content || "",
      path: path,
      isUntitled: isUntitled,
      isDirty: false
    };

    this.tabs.push(tab);
    this.hideHomeDashboard();
    this.renderTabs();
    this.renderFileTree();
    this.switchTab(tabId);
    return tab;
  }

  createWelcomeTab() {
    const defaultMarkdown = `# 欢迎使用 MiniMark 极简 Markdown 编辑查看器

一款专注于**极简排版**、**沉浸阅读**与**流畅书写**的 Windows 桌面应用。

---

## 🎯 核心功能概览
- [x] **极简无干扰**：风格纯净质感，深浅主题无缝跟随 Windows 系统。
- [x] **悬浮模式胶囊**：默认进入【仅查看模式】，点击右上角胶囊可自由切换【双栏】与【仅编辑】。
- [x] **主页与最近记录**：关闭所有页签后自动进入主页，快捷管理最近打开的文件与文件夹。
- [x] **未保存安全防御**：关闭未保存页签时弹出【取消 / 不保存 / 保存】提示，若选择不保存则彻底从工作区移除。
- [x] **工作区分割线**：临时草稿与文件夹目录树清晰分隔，像素级垂直对齐。
- [x] **KaTeX 数学公式**：支持行内公式 $E = mc^2$ 与高精度块级公式排版。
- [x] **Mermaid 图表引擎**：实时绘制流程图、时序图与类图。

---

## 📐 1. 数学公式支持 (KaTeX)
行内公式示例：根据欧拉公式 $e^{i\\pi} + 1 = 0$，我们可以展开以下高斯积分：

$$ \\int_{-\\infty}^{+\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi} $$

---

## 📊 2. Mermaid 图表支持
\`\`\`mermaid
graph TD
    A[📂 打开工作区 / Markdown 文件] --> B[⚡ 极速解析渲染引擎]
    B --> C{右上角悬浮胶囊}
    C -->|👁 默认| D[沉浸式阅读查看]
    C -->|◫ 双栏| E[双向联动实时对照]
    C -->|✎ 新建| F[默认进入纯净编辑]
\`\`\`

---

## 💻 3. 代码语法高亮与一键复制
\`\`\`python
def fibonacci(n: int) -> int:
    \"\"\"计算斐波那契数列第 n 项\"\"\"
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

if __name__ == "__main__":
    print([fibonacci(i) for i in range(10)])
\`\`\`

---

## ⌨️ 常用快捷键
| 快捷键 | 功能描述 |
| :--- | :--- |
| \`Ctrl + N\` | 新建临时文件 (默认编辑状态) |
| \`Ctrl + O\` | 打开本地 Markdown 文件 |
| \`Ctrl + K Ctrl + O\` | 打开本地工作区文件夹 |
| \`Ctrl + S\` | 保存当前文档 |
| \`Ctrl + B\` | 展开 / 折叠侧边栏 |
| \`Ctrl + F\` | 查找与黄色高亮文本 |
| \`Ctrl + 1 / 2 / 3\` | 切换 纯编辑 / 双栏 / 纯查看 |

> 开始享受专注的创作体验吧！
`;

    this.createTab("README.md", defaultMarkdown, null, false);
  }

  switchTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    this.activeTabId = tabId;
    this.hideHomeDashboard();
    this.dom.editorTextarea.value = tab.content;
    this.renderTabs();
    this.renderCurrentMarkdown();
    this.renderFileTree();
    this.updateStatusBar();

    // 更新窗口标题
    if (this.backend && this.backend.set_window_title) {
      this.backend.set_window_title(tab.name);
    }
  }

  closeTab(tabId, e) {
    if (e) e.stopPropagation();

    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = this.tabs[tabIndex];

    // 未保存判断：脏状态 或 (临时未命名文件有实际输入内容)
    const isUnsaved = tab.isDirty || (tab.isUntitled && tab.content && tab.content.trim() !== "");

    if (isUnsaved) {
      this.showSaveConfirmDialog(tab);
      return;
    }

    this.forceCloseTab(tabId);
  }

  showSaveConfirmDialog(tab) {
    this.pendingCloseTab = tab;
    const msg = this.lang === "zh" 
      ? `文件 "${tab.name}" 尚未保存，是否在关闭前保存更改？`
      : `File "${tab.name}" has unsaved changes. Do you want to save before closing?`;

    this.dom.saveConfirmMessage.innerText = msg;
    this.dom.saveConfirmModal.style.display = "flex";
  }

  hideSaveConfirmDialog() {
    this.dom.saveConfirmModal.style.display = "none";
    this.pendingCloseTab = null;
  }

  handleSaveConfirmCancel() {
    this.hideSaveConfirmDialog();
  }

  handleSaveConfirmDontSave() {
    const tab = this.pendingCloseTab;
    if (!tab) return;

    const targetId = tab.id;
    this.hideSaveConfirmDialog();

    // 不保存：继续关闭页签并彻底从工作区移除
    this.forceCloseTab(targetId);
    this.showToast(I18N[this.lang].closedWithoutSaving, "info", 1500);
  }

  handleSaveConfirmSave() {
    const tab = this.pendingCloseTab;
    if (!tab) return;

    const targetId = tab.id;
    this.hideSaveConfirmDialog();

    // 关键规范：如果是临时文件关闭页签时提示保存，点保存后工作区不用切换成文件保存目录
    if (tab.isUntitled || !tab.path) {
      if (this.backend && this.backend.save_file_as_dialog) {
        this.backend.save_file_as_dialog(tab.name, tab.content, (resStr) => {
          try {
            const res = JSON.parse(resStr);
            if (res.success && res.path) {
              this.addRecentFile(res.path, res.name);
              // 工作区不切换，直接关闭页签
              this.forceCloseTab(targetId);
            }
          } catch (e) {
            console.error("Save as error:", e);
          }
        });
      } else {
        this.forceCloseTab(targetId);
      }
    } else {
      if (this.backend && this.backend.save_file) {
        this.backend.save_file(tab.path, tab.content, (resStr) => {
          try {
            const res = JSON.parse(resStr);
            if (res.success) {
              this.addRecentFile(tab.path, tab.name);
              // 工作区不切换，直接关闭页签
              this.forceCloseTab(targetId);
            }
          } catch (e) {
            console.error("Save error:", e);
          }
        });
      } else {
        this.forceCloseTab(targetId);
      }
    }
  }

  forceCloseTab(tabId) {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    this.tabs.splice(tabIndex, 1);

    // 重新渲染标签栏和工作区文件树（确保临时文件立刻从工作区消失）
    this.renderTabs();
    this.renderFileTree();

    if (this.tabs.length === 0) {
      // 所有页签关闭后进入主页
      this.showHomeDashboard();
    } else if (this.activeTabId === tabId) {
      const nextActiveIndex = Math.min(tabIndex, this.tabs.length - 1);
      this.switchTab(this.tabs[nextActiveIndex].id);
    } else {
      this.updateStatusBar();
    }
  }

  renderTabs() {
    this.dom.tabsContainer.innerHTML = "";
    this.tabs.forEach(tab => {
      const tabEl = document.createElement("div");
      tabEl.className = "tab-item" + (tab.id === this.activeTabId ? " active" : "");
      tabEl.onclick = () => this.switchTab(tab.id);

      tabEl.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <span class="tab-title" title="${tab.path || tab.name}">${tab.name}</span>
        ${tab.isDirty ? '<span class="tab-dirty-dot" title="已修改未保存"></span>' : ''}
        <span class="tab-close-btn" title="关闭标签页 (Ctrl+W)">×</span>
      `;

      const closeBtn = tabEl.querySelector(".tab-close-btn");
      closeBtn.onclick = (e) => this.closeTab(tab.id, e);

      this.dom.tabsContainer.appendChild(tabEl);
    });

    // 标签栏新建按钮
    const newTabBtn = document.createElement("button");
    newTabBtn.className = "icon-btn";
    newTabBtn.style.width = "24px";
    newTabBtn.style.height = "24px";
    newTabBtn.title = I18N[this.lang].newFile;
    newTabBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    `;
    newTabBtn.onclick = () => this.handleNewFile();
    this.dom.tabsContainer.appendChild(newTabBtn);
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId);
  }

  // ==================== 文件与工作区 IO ====================

  handleNewFile() {
    const untitledCount = this.tabs.filter(t => t.isUntitled).length + 1;
    const name = untitledCount === 1 ? I18N[this.lang].untitled : `未命名-${untitledCount}.md`;
    this.createTab(name, "", null, true);

    // 新建临时文件默认进入编辑状态
    this.setMode("edit");
    setTimeout(() => {
      this.dom.editorTextarea.focus();
    }, 60);
  }

  handleOpenFile() {
    if (this.backend && this.backend.open_file_dialog) {
      this.backend.open_file_dialog((resStr) => {
        try {
          const res = JSON.parse(resStr);
          if (res.success) {
            this.openFileFromData(res.path, res.name, res.content);
            if (res.dir && !this.workspaceData) {
              this.loadWorkspace(res.dir);
            }
          }
        } catch (e) {
          console.error("Open file error:", e);
        }
      });
    } else {
      const mockContent = "# 本地 Markdown 文件\n\n这是在纯浏览器中模拟打开的示例文件。";
      this.createTab("local_sample.md", mockContent, "sample.md", false);
    }
  }

  handleOpenFolder() {
    if (this.backend && this.backend.open_folder_dialog) {
      this.backend.open_folder_dialog((resStr) => {
        try {
          const res = JSON.parse(resStr);
          if (res.success && res.data) {
            this.workspaceData = res.data;
            this.addRecentFolder(res.data.path, res.data.name);
            this.renderFileTree();
            this.renderHomeRecents();
            if (this.isSidebarCollapsed) this.toggleSidebar();
          }
        } catch (e) {
          console.error("Open folder error:", e);
        }
      });
    } else {
      this.workspaceData = {
        name: "notesapp",
        path: "notesapp",
        isDir: true,
        children: [
          { name: "README.md", path: "notesapp/README.md", isDir: false, ext: ".md" },
          { name: "quickstart.md", path: "notesapp/quickstart.md", isDir: false, ext: ".md" },
          { name: "image.png", path: "notesapp/image.png", isDir: false, ext: ".png" },
          {
            name: "docs",
            path: "notesapp/docs",
            isDir: true,
            children: [
              { name: "api_spec.md", path: "notesapp/docs/api_spec.md", isDir: false, ext: ".md" }
            ]
          }
        ]
      };
      this.addRecentFolder("notesapp", "notesapp");
      this.renderFileTree();
      this.renderHomeRecents();
    }
  }

  openFileByPath(filePath, fileName = null) {
    const ext = (filePath.split(".").pop() || "").toLowerCase();
    const dotExt = "." + ext;
    if (!SUPPORTED_EXTENSIONS.includes(dotExt)) {
      this.showToast(I18N[this.lang].unsupportedFile, "warning");
      return;
    }

    const existing = this.tabs.find(t => t.path === filePath);
    if (existing) {
      this.switchTab(existing.id);
      return;
    }

    if (this.backend && this.backend.read_file) {
      this.backend.read_file(filePath, (resStr) => {
        try {
          const res = JSON.parse(resStr);
          if (res.success) {
            this.openFileFromData(res.path, res.name, res.content);
          } else {
            this.showToast("打开文件失败: " + res.error, "error");
          }
        } catch (e) {
          console.error("Read file error:", e);
        }
      });
    }
  }

  openFileFromData(path, name, content) {
    this.addRecentFile(path, name);
    this.renderHomeRecents();

    const currentTab = this.getActiveTab();
    if (currentTab && currentTab.isUntitled && !currentTab.isDirty && currentTab.content === "") {
      currentTab.path = path;
      currentTab.name = name;
      currentTab.content = content;
      currentTab.originalContent = content;
      currentTab.isUntitled = false;
      currentTab.isDirty = false;
      this.hideHomeDashboard();
      this.dom.editorTextarea.value = content;
      this.renderTabs();
      this.renderFileTree();
      this.renderCurrentMarkdown();
      this.updateStatusBar();
    } else {
      this.createTab(name, content, path, false);
    }
  }

  handleSaveFile() {
    const tab = this.getActiveTab();
    if (!tab) return;

    if (tab.isUntitled || !tab.path) {
      // 用户主动保存临时文件：触发另存为，并切换工作区
      this.handleSaveAsFile(true);
      return;
    }

    // 用户在已打开的工作区文件夹中修改文件后保存：工作区仍为当前工作区，不切换
    if (this.backend && this.backend.save_file) {
      this.backend.save_file(tab.path, tab.content, (resStr) => {
        try {
          const res = JSON.parse(resStr);
          if (res.success) {
            tab.isDirty = false;
            tab.originalContent = tab.content;
            this.addRecentFile(tab.path, tab.name);
            this.renderTabs();
            this.renderHomeRecents();
            this.showToast("保存成功", "info", 1500);
          } else {
            this.showToast("保存失败: " + res.error, "error");
          }
        } catch (e) {
          console.error("Save error:", e);
        }
      });
    } else {
      tab.isDirty = false;
      this.renderTabs();
      this.showToast("保存成功 (演示模式)", "info", 1500);
    }
  }

  handleSaveAsFile(isUserActiveSave = false) {
    const tab = this.getActiveTab();
    if (!tab) return;

    const wasUntitled = tab.isUntitled || !tab.path;

    if (this.backend && this.backend.save_file_as_dialog) {
      this.backend.save_file_as_dialog(tab.name, tab.content, (resStr) => {
        try {
          const res = JSON.parse(resStr);
          if (res.success && res.path) {
            tab.path = res.path;
            tab.name = res.name || res.path.split(/[/\\]/).pop();
            tab.isUntitled = false;
            tab.isDirty = false;
            tab.originalContent = tab.content;
            this.addRecentFile(tab.path, tab.name);
            this.renderTabs();
            this.renderFileTree();
            this.renderHomeRecents();
            this.updateStatusBar();
            if (this.backend.set_window_title) {
              this.backend.set_window_title(tab.name);
            }
            this.showToast("已保存至 " + tab.name, "info", 1500);

            // 关键规范：仅有用户主动保存临时文件的时候工作区要切换成保存的目录
            if (wasUntitled && isUserActiveSave) {
              const savedDir = res.dir || tab.path.substring(0, Math.max(tab.path.lastIndexOf('/'), tab.path.lastIndexOf('\\')));
              if (savedDir) this.loadWorkspace(savedDir);
            }
          }
        } catch (e) {
          console.error("Save as error:", e);
        }
      });
    } else {
      tab.path = "notesapp/" + tab.name;
      tab.isUntitled = false;
      tab.isDirty = false;
      this.renderTabs();
      this.renderFileTree();
      if (wasUntitled && isUserActiveSave) {
        this.loadWorkspace("notesapp");
      }
      this.showToast("已保存并在工作区显示所在目录 (演示模式)", "info", 1500);
    }
  }

  loadWorkspace(folderPath) {
    if (this.backend && this.backend.get_folder_tree) {
      this.backend.get_folder_tree(folderPath, (resStr) => {
        try {
          const res = JSON.parse(resStr);
          if (res.success && res.data) {
            this.workspaceData = res.data;
            this.addRecentFolder(res.data.path, res.data.name);
            this.renderFileTree();
            this.renderHomeRecents();
            if (this.isSidebarCollapsed) this.toggleSidebar();
          }
        } catch (e) {
          console.error("Load workspace error:", e);
        }
      });
    }
  }

  // ==================== 侧边栏文件树与临时文件展示 (像素级对齐 & 分割线) ====================

  renderFileTree() {
    const treeEl = this.dom.fileTree;
    treeEl.innerHTML = "";

    // 收集未保存/未指定路径的临时草稿
    const tempTabs = this.tabs.filter(t => t.isUntitled || !t.path);

    if (!this.workspaceData) {
      const emptyActions = document.createElement("div");
      emptyActions.className = "sidebar-empty-actions";
      emptyActions.innerHTML = `
        <button class="sidebar-action-btn" onclick="app.handleOpenFolder()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>${I18N[this.lang].openFolderAction}</span>
        </button>
        <button class="sidebar-action-btn" onclick="app.handleOpenFile()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
          <span>${I18N[this.lang].openFileAction}</span>
        </button>
        <button class="sidebar-action-btn" onclick="app.handleNewFile()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>${I18N[this.lang].newFileAction}</span>
        </button>
      `;
      treeEl.appendChild(emptyActions);

      if (tempTabs.length > 0) {
        const tempSectionTitle = document.createElement("div");
        tempSectionTitle.style.cssText = "padding: 10px 12px 4px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;";
        tempSectionTitle.innerText = this.lang === "zh" ? "临时草稿文件" : "Draft Files";
        treeEl.appendChild(tempSectionTitle);

        tempTabs.forEach(tab => {
          const nodeEl = document.createElement("div");
          nodeEl.className = "tree-node temp-file" + (tab.id === this.activeTabId ? " active" : "");
          nodeEl.innerHTML = `
            <span class="node-spacer"></span>
            <span class="node-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </span>
            <span class="tree-node-name">${tab.name}</span>
            <span class="temp-tag">${I18N[this.lang].tempTag}</span>
          `;
          nodeEl.onclick = () => this.switchTab(tab.id);
          treeEl.appendChild(nodeEl);
        });
      }
      return;
    }

    this.dom.workspaceTitle.innerText = this.workspaceData.name || I18N[this.lang].workspace;

    // 1. 如果有临时文件，置顶展示在工作区
    if (tempTabs.length > 0) {
      tempTabs.forEach(tab => {
        const nodeEl = document.createElement("div");
        nodeEl.className = "tree-node temp-file" + (tab.id === this.activeTabId ? " active" : "");
        nodeEl.innerHTML = `
          <span class="node-spacer"></span>
          <span class="node-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </span>
          <span class="tree-node-name">${tab.name}</span>
          <span class="temp-tag">${I18N[this.lang].tempTag}</span>
        `;
        nodeEl.onclick = () => this.switchTab(tab.id);
        treeEl.appendChild(nodeEl);
      });

      // 2. 临时文件与打开的文件夹目录中间添加一条浅色横线分割
      if (this.workspaceData.children && this.workspaceData.children.length > 0) {
        const divider = document.createElement("div");
        divider.className = "sidebar-tree-divider";
        treeEl.appendChild(divider);
      }
    }

    // 3. 递归展示工作区目录树 (严格对齐)
    const createNodeEl = (item) => {
      const container = document.createElement("div");
      const nodeEl = document.createElement("div");
      nodeEl.className = "tree-node";
      nodeEl.dataset.path = item.path;

      const activeTab = this.getActiveTab();
      if (activeTab && activeTab.path === item.path) {
        nodeEl.classList.add("active");
      }

      if (item.isDir) {
        nodeEl.innerHTML = `
          <span class="node-chevron">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
          <span class="node-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          <span class="tree-node-name">${item.name}</span>
        `;

        const childrenContainer = document.createElement("div");
        childrenContainer.className = "tree-children";

        if (item.children && item.children.length > 0) {
          item.children.forEach(child => {
            childrenContainer.appendChild(createNodeEl(child));
          });
        }

        nodeEl.onclick = (e) => {
          e.stopPropagation();
          nodeEl.classList.toggle("expanded");
          childrenContainer.classList.toggle("show");
        };

        container.appendChild(nodeEl);
        container.appendChild(childrenContainer);
      } else {
        const ext = (item.name.split(".").pop() || "").toLowerCase();
        const isMd = SUPPORTED_EXTENSIONS.includes("." + ext);

        nodeEl.innerHTML = `
          <span class="node-spacer"></span>
          <span class="node-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" color="${isMd ? 'inherit' : 'var(--text-dim)'}">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </span>
          <span class="tree-node-name" style="${isMd ? '' : 'color:var(--text-dim);'}">${item.name}</span>
        `;

        nodeEl.onclick = (e) => {
          e.stopPropagation();
          this.openFileByPath(item.path, item.name);
        };

        container.appendChild(nodeEl);
      }

      nodeEl.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, item);
      };

      return container;
    };

    if (this.workspaceData.children && this.workspaceData.children.length > 0) {
      this.workspaceData.children.forEach(child => {
        treeEl.appendChild(createNodeEl(child));
      });
    }
  }

  showContextMenu(x, y, item) {
    this.contextTarget = item;
    const menu = this.dom.contextMenu;
    menu.style.left = `${Math.min(x, window.innerWidth - 180)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
    menu.style.display = "block";
  }

  hideContextMenu() {
    this.dom.contextMenu.style.display = "none";
    this.contextTarget = null;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.dom.sidebar.classList.toggle("collapsed", this.isSidebarCollapsed);
  }

  // ==================== Markdown 渲染核心 ====================

  renderCurrentMarkdown() {
    const tab = this.getActiveTab();
    if (!tab) return;

    if (this.mode === "edit") return;

    const rawMarkdown = tab.content || "";

    let html = "";
    if (window.marked) {
      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: true
      });
      html = marked.parse(rawMarkdown);
    } else {
      html = rawMarkdown.replace(/\n/g, "<br>");
    }

    this.dom.previewContent.innerHTML = html;

    if (window.renderMathInElement) {
      renderMathInElement(this.dom.previewContent, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    }

    if (window.mermaid) {
      const mermaidCodeBlocks = this.dom.previewContent.querySelectorAll("pre code.language-mermaid");
      mermaidCodeBlocks.forEach((codeEl) => {
        const pre = codeEl.parentElement;
        const codeText = codeEl.textContent;
        const div = document.createElement("div");
        div.className = "mermaid";
        div.textContent = codeText;
        pre.parentNode.replaceChild(div, pre);
      });
      try {
        mermaid.run({ nodes: this.dom.previewContent.querySelectorAll(".mermaid") });
      } catch (err) {
        console.warn("Mermaid render warning:", err);
      }
    }

    if (window.Prism) {
      Prism.highlightAllUnder(this.dom.previewContent);
    }

    this.dom.previewContent.querySelectorAll("pre").forEach(pre => {
      if (pre.querySelector(".code-copy-btn")) return;
      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.innerText = I18N[this.lang].copyCode;
      copyBtn.onclick = () => {
        const codeText = pre.querySelector("code") ? pre.querySelector("code").innerText : pre.innerText;
        navigator.clipboard.writeText(codeText).then(() => {
          copyBtn.innerText = I18N[this.lang].copied;
          setTimeout(() => { copyBtn.innerText = I18N[this.lang].copyCode; }, 1500);
        });
      };
      pre.appendChild(copyBtn);
    });

    this.dom.previewContent.querySelectorAll("input[type='checkbox']").forEach((checkbox) => {
      checkbox.removeAttribute("disabled");
      checkbox.onchange = () => {
        this.syncTaskCheckboxClick(checkbox);
      };
    });

    if (this.dom.searchPanel.style.display !== "none" && this.searchState.query) {
      this.executeSearchHighlight(this.searchState.query);
    }
  }

  syncTaskCheckboxClick(checkbox) {
    const tab = this.getActiveTab();
    if (!tab) return;

    const li = checkbox.closest("li");
    if (!li) return;
    const taskText = li.innerText.trim();

    let lines = tab.content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(taskText)) {
        if (checkbox.checked) {
          lines[i] = lines[i].replace(/- \[[ ]\]/, "- [x]");
        } else {
          lines[i] = lines[i].replace(/- \[[xX]\]/, "- [ ]");
        }
        break;
      }
    }
    tab.content = lines.join("\n");
    this.dom.editorTextarea.value = tab.content;
    this.handleEditorInput();
  }

  // ==================== 搜索与高亮 / 上一个 / 下一个 ====================

  toggleSearch(showReplace = false) {
    const isVisible = this.dom.searchPanel.style.display !== "none";
    if (isVisible && !showReplace) {
      this.dom.searchPanel.style.display = "none";
      this.clearSearchHighlight();
    } else {
      this.dom.searchPanel.style.display = "flex";
      this.dom.replaceRow.style.display = showReplace ? "flex" : "none";
      this.dom.searchInput.focus();
      this.dom.searchInput.select();
      if (this.dom.searchInput.value) {
        this.handleSearch(this.dom.searchInput.value);
      }
    }
  }

  handleSearch(query) {
    this.searchState.query = query;
    if (!query || query.trim() === "") {
      this.clearSearchHighlight();
      this.dom.searchCount.innerText = "0/0";
      return;
    }

    this.executeSearchHighlight(query);
  }

  clearSearchHighlight() {
    const preview = this.dom.previewContent;
    const marks = preview.querySelectorAll("mark.search-highlight");
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
    this.searchState.previewMarks = [];
    this.searchState.editorMatchIndices = [];
    this.searchState.currentIndex = -1;
  }

  executeSearchHighlight(query) {
    this.clearSearchHighlight();
    const cleanQuery = query.toLowerCase();

    const preview = this.dom.previewContent;
    const marks = [];

    const walker = document.createTreeWalker(
      preview,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parentTag = node.parentElement ? node.parentElement.tagName : "";
          if (["SCRIPT", "STYLE"].includes(parentTag)) return NodeFilter.FILTER_REJECT;
          if (node.nodeValue && node.nodeValue.toLowerCase().includes(cleanQuery)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      },
      false
    );

    const targetNodes = [];
    let textNode;
    while (textNode = walker.nextNode()) {
      targetNodes.push(textNode);
    }

    for (const node of targetNodes) {
      const parent = node.parentNode;
      if (!parent) continue;

      const text = node.nodeValue;
      const regex = new RegExp(`(${cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
      const parts = text.split(regex);

      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (part.toLowerCase() === cleanQuery) {
          const mark = document.createElement("mark");
          mark.className = "search-highlight";
          mark.textContent = part;
          frag.appendChild(mark);
          marks.push(mark);
        } else if (part) {
          frag.appendChild(document.createTextNode(part));
        }
      }
      parent.replaceChild(frag, node);
    }

    this.searchState.previewMarks = marks;

    const tab = this.getActiveTab();
    const matchIndices = [];
    if (tab && tab.content) {
      const content = tab.content;
      let pos = 0;
      while (pos < content.length) {
        const found = content.toLowerCase().indexOf(cleanQuery, pos);
        if (found === -1) break;
        matchIndices.push(found);
        pos = found + cleanQuery.length;
      }
    }
    this.searchState.editorMatchIndices = matchIndices;

    const totalMatches = Math.max(marks.length, matchIndices.length);
    if (totalMatches > 0) {
      this.searchState.currentIndex = 0;
      this.updateActiveMatch();
    } else {
      this.dom.searchCount.innerText = "0/0";
    }
  }

  updateActiveMatch() {
    const { previewMarks, editorMatchIndices, currentIndex, query } = this.searchState;
    const totalMatches = Math.max(previewMarks.length, editorMatchIndices.length);

    if (totalMatches === 0 || currentIndex < 0) {
      this.dom.searchCount.innerText = "0/0";
      return;
    }

    this.dom.searchCount.innerText = `${currentIndex + 1}/${totalMatches}`;

    previewMarks.forEach((m, idx) => {
      if (idx === currentIndex) {
        m.classList.add("active-match");
        m.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        m.classList.remove("active-match");
      }
    });

    if (editorMatchIndices.length > currentIndex && (this.mode === "edit" || this.mode === "split")) {
      const matchPos = editorMatchIndices[currentIndex];
      const textarea = this.dom.editorTextarea;
      textarea.focus();
      textarea.setSelectionRange(matchPos, matchPos + query.length);

      const linesBefore = textarea.value.substring(0, matchPos).split("\n").length;
      const lineHeight = 23;
      textarea.scrollTop = Math.max(0, (linesBefore - 5) * lineHeight);
    }
  }

  findNext() {
    const { previewMarks, editorMatchIndices } = this.searchState;
    const totalMatches = Math.max(previewMarks.length, editorMatchIndices.length);
    if (totalMatches === 0) return;

    this.searchState.currentIndex = (this.searchState.currentIndex + 1) % totalMatches;
    this.updateActiveMatch();
  }

  findPrev() {
    const { previewMarks, editorMatchIndices } = this.searchState;
    const totalMatches = Math.max(previewMarks.length, editorMatchIndices.length);
    if (totalMatches === 0) return;

    this.searchState.currentIndex = (this.searchState.currentIndex - 1 + totalMatches) % totalMatches;
    this.updateActiveMatch();
  }

  replaceCurrent() {
    const query = this.dom.searchInput.value;
    const replaceWith = this.dom.replaceInput.value || "";
    if (!query) return;

    const textarea = this.dom.editorTextarea;
    const selStart = textarea.selectionStart;
    const selEnd = textarea.selectionEnd;
    const selectedText = textarea.value.substring(selStart, selEnd);

    if (selectedText.toLowerCase() === query.toLowerCase()) {
      textarea.setRangeText(replaceWith, selStart, selEnd, "end");
      this.handleEditorInput();
      this.handleSearch(query);
    } else {
      this.findNext();
    }
  }

  replaceAll() {
    const query = this.dom.searchInput.value;
    const replaceWith = this.dom.replaceInput.value || "";
    if (!query) return;

    const tab = this.getActiveTab();
    if (!tab) return;

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    tab.content = tab.content.replace(regex, replaceWith);
    this.dom.editorTextarea.value = tab.content;
    this.handleEditorInput();
    this.handleSearch(query);
    this.showToast("已完成全部替换", "info", 1500);
  }

  // ==================== 状态栏与输入监听 ====================

  handleEditorInput() {
    const tab = this.getActiveTab();
    if (!tab) return;

    tab.content = this.dom.editorTextarea.value;
    tab.isDirty = tab.content !== tab.originalContent;

    this.renderTabs();
    this.updateStatusBar();

    if (this.mode === "split") {
      this.renderCurrentMarkdown();
    }
  }

  updateStatusBar() {
    const tab = this.getActiveTab();
    if (!tab) {
      this.dom.statusPath.innerText = this.workspaceData ? this.workspaceData.path : "MiniMark 主页";
      this.dom.statusStats.innerText = "";
      this.dom.statusMode.innerText = "状态: 待命";
      return;
    }

    const t = I18N[this.lang];
    this.dom.statusPath.innerText = tab.path || `${tab.name} (${t.tempTag})`;

    const text = tab.content || "";
    const lines = text.split("\n").length;
    const chars = text.length;
    const words = (text.match(/[\w\d\u4e00-\u9fa5]+/g) || []).length;

    this.dom.statusStats.innerText = `${lines} ${t.statusLines}  |  ${words} ${t.statusWords}  |  ${chars} ${t.statusChars}`;
    this.dom.statusMode.innerText = `${t.statusMode}: ${this.mode === "preview" ? t.modePreview : (this.mode === "split" ? t.modeSplit : t.modeEdit)}`;
  }

  // ==================== 滚动联动 ====================

  initScrollSync() {
    const editor = this.dom.editorTextarea;
    const preview = this.dom.previewContainer;

    editor.onscroll = () => {
      if (this.mode !== "split" || this.isSyncingScroll) return;
      this.isSyncingScroll = true;
      const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
      setTimeout(() => { this.isSyncingScroll = false; }, 40);
    };

    preview.onscroll = () => {
      if (this.mode !== "split" || this.isSyncingScroll) return;
      this.isSyncingScroll = true;
      const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);
      editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
      setTimeout(() => { this.isSyncingScroll = false; }, 40);
    };
  }

  // ==================== 事件与快捷键 ====================

  initEventListeners() {
    this.dom.editorTextarea.addEventListener("input", () => this.handleEditorInput());

    this.dom.modeCapsule.addEventListener("click", (e) => this.toggleCapsule(e));
    document.addEventListener("click", () => {
      this.closeCapsule();
      this.hideContextMenu();
    });

    this.dom.searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
    this.dom.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrev();
        } else {
          this.findNext();
        }
      } else if (e.key === "Escape") {
        this.toggleSearch(false);
      }
    });

    this.initScrollSync();
    this.initSplitterDrag();
  }

  initSplitterDrag() {
    const splitter = this.dom.panesSplitter;
    const editor = this.dom.editorContainer;
    let isDragging = false;

    splitter.onmousedown = (e) => {
      isDragging = true;
      splitter.classList.add("dragging");
      document.body.style.cursor = "col-resize";
    };

    document.onmousemove = (e) => {
      if (!isDragging) return;
      const containerRect = document.querySelector(".editor-wrapper").getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      if (newWidth > 150 && newWidth < containerRect.width - 150) {
        editor.style.flex = "none";
        editor.style.width = `${newWidth}px`;
      }
    };

    document.onmouseup = () => {
      if (isDragging) {
        isDragging = false;
        splitter.classList.remove("dragging");
        document.body.style.cursor = "";
      }
    };
  }

  initShortcuts() {
    window.addEventListener("keydown", (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (e.key === "Escape" && this.dom.saveConfirmModal.style.display !== "none") {
        this.hideSaveConfirmDialog();
        return;
      }

      if (isCtrl && e.key.toLowerCase() === "n") {
        e.preventDefault();
        this.handleNewFile();
      } else if (isCtrl && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.handleSaveAsFile(true);
      } else if (isCtrl && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.handleSaveFile();
      } else if (isCtrl && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        this.handleOpenFolder();
      } else if (isCtrl && e.key.toLowerCase() === "o") {
        e.preventDefault();
        this.handleOpenFile();
      } else if (isCtrl && e.key.toLowerCase() === "w") {
        e.preventDefault();
        if (this.activeTabId) this.closeTab(this.activeTabId);
      } else if (isCtrl && e.key.toLowerCase() === "b") {
        e.preventDefault();
        this.toggleSidebar();
      } else if (isCtrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        this.toggleSearch(false);
      } else if (isCtrl && e.key.toLowerCase() === "h") {
        e.preventDefault();
        this.toggleSearch(true);
      } else if (isCtrl && e.key === "1") {
        e.preventDefault();
        this.setMode("edit");
      } else if (isCtrl && e.key === "2") {
        e.preventDefault();
        this.setMode("split");
      } else if (isCtrl && e.key === "3") {
        e.preventDefault();
        this.setMode("preview");
      }
    });
  }
}

// 实例化应用
window.addEventListener("DOMContentLoaded", () => {
  window.app = new MiniMarkApp();
});
