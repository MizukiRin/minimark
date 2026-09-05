/**
 * MiniMark - 极简 Markdown 编辑与查看器 前端核心逻辑 (v2.0)
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
    saveAsFile: "另存为... (Ctrl+Shift+S)",
    search: "搜索 (Ctrl+F)",
    replace: "查找与替换 (Ctrl+H)",
    theme: "切换主题",
    lang: "English",
    toggleSidebar: "展开/折叠侧边栏 (Ctrl+B)",
    outline: "大纲",
    toggleOutline: "展开/折叠大纲",
    hideOutline: "隐藏大纲",
    noOutline: "暂无文档大纲",
    tipsCheatSheet: "Markdown 语法速查指南",
    cheatSheetTitle: "Markdown语法速查.md",
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
    saveAsFile: "Save As... (Ctrl+Shift+S)",
    search: "Search (Ctrl+F)",
    replace: "Search & Replace (Ctrl+H)",
    theme: "Toggle Theme",
    lang: "简体中文",
    toggleSidebar: "Toggle Sidebar (Ctrl+B)",
    outline: "OUTLINE",
    toggleOutline: "Toggle Outline",
    hideOutline: "Hide Outline",
    noOutline: "No headings in document",
    tipsCheatSheet: "Markdown Syntax Guide",
    cheatSheetTitle: "Markdown-Cheatsheet.md",
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
    this.isOutlineOpen = false;

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
    this.outlineDebounceTimer = null;

    // DOM 元素引用
    this.dom = {
      titlebar: document.getElementById("titlebar"),
      tabsContainer: document.getElementById("tabs-container"),
      sidebar: document.getElementById("sidebar"),
      fileTree: document.getElementById("file-tree"),
      sidebarOutline: document.getElementById("sidebar-outline"),
      outlineSplitter: document.getElementById("outline-splitter"),
      outlineTree: document.getElementById("outline-tree"),
      btnSidebarOutline: document.getElementById("btn-sidebar-outline"),
      floatingOutlineBtn: document.getElementById("floating-outline-btn"),
      floatingTipsBtn: document.getElementById("floating-tips-btn"),
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
    this.initTabIndentation();
    this.initOutlineDrag();

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
    this.initBridge();
  }

  initBridge() {
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
        if (this.backend.themeChanged && this.backend.themeChanged.connect) {
          this.backend.themeChanged.connect((newTheme) => {
            this.setTheme(newTheme);
          });
        }
      });
    } else if (window.pywebview && window.pywebview.api) {
      this.setupPyWebviewBridge();
    } else {
      window.addEventListener("pywebviewready", () => {
        this.setupPyWebviewBridge();
      });
      console.log("Waiting for backend bridge or running in standalone browser mode.");
      this.detectBrowserTheme();
    }
  }

  setupPyWebviewBridge() {
    if (!window.pywebview || !window.pywebview.api) return;
    const api = window.pywebview.api;
    const toResStr = (r) => (typeof r === "string" ? r : JSON.stringify(r));

    const themeListeners = [];
    window.addEventListener("minimark-theme-changed", (e) => {
      const newTheme = e.detail;
      themeListeners.forEach((fn) => {
        try { fn(newTheme); } catch (err) { console.error(err); }
      });
    });

    this.backend = {
      get_system_theme: (cb) => {
        api.get_system_theme().then((res) => cb && cb(res));
      },
      get_system_locale: (cb) => {
        api.get_system_locale().then((res) => cb && cb(res));
      },
      set_window_title: (title) => {
        api.set_window_title(title);
      },
      open_file_dialog: (cb) => {
        api.open_file_dialog().then((res) => cb && cb(toResStr(res)));
      },
      read_file: (path, cb) => {
        api.read_file(path).then((res) => cb && cb(toResStr(res)));
      },
      save_file: (path, content, cb) => {
        api.save_file(path, content).then((res) => cb && cb(toResStr(res)));
      },
      save_file_as_dialog: (name, content, cb) => {
        api.save_file_as_dialog(name, content).then((res) => cb && cb(toResStr(res)));
      },
      open_folder_dialog: (cb) => {
        api.open_folder_dialog().then((res) => cb && cb(toResStr(res)));
      },
      get_folder_tree: (path, cb) => {
        api.get_folder_tree(path).then((res) => cb && cb(toResStr(res)));
      },
      create_file: (dir, name, cb) => {
        api.create_file(dir, name).then((res) => cb && cb(toResStr(res)));
      },
      create_folder: (dir, name, cb) => {
        api.create_folder(dir, name).then((res) => cb && cb(toResStr(res)));
      },
      rename_path: (oldPath, newName, cb) => {
        api.rename_path(oldPath, newName).then((res) => cb && cb(toResStr(res)));
      },
      delete_path: (path, cb) => {
        api.delete_path(path).then((res) => cb && cb(toResStr(res)));
      },
      reveal_in_explorer: (path) => {
        api.reveal_in_explorer(path);
      },
      themeChanged: {
        connect: (cb) => {
          if (typeof cb === "function") themeListeners.push(cb);
        }
      }
    };
    window.backend = this.backend;

    // 获取系统语言与深浅主题
    this.backend.get_system_theme((sysTheme) => {
      this.setTheme(sysTheme || "light");
    });
    this.backend.get_system_locale((sysLocale) => {
      this.lang = sysLocale === "zh" ? "zh" : "en";
      this.updateI18n();
    });

    this.backend.themeChanged.connect((newTheme) => {
      this.setTheme(newTheme);
    });
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
    this.renderOutline();
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
    this.renderOutline();
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
- [x] **工作区大纲 (TOC)**：支持在工作区底部展开多级文档大纲，支持上下拖拽调节高度并平滑跳转。
- [x] **智能标题提取**：新建文件保存或另存为时，自动识别抓取最高级标题作为默认文件名。
- [x] **Tab 快捷缩进**：源码编辑器完美支持 \`Tab\` 与 \`Shift+Tab\` 单行与批量多行缩进。
- [x] **语法速查指南**：点击右上角模式胶囊下方的提示按钮，一键调出 Markdown 语法全景指南。
- [x] **主页与最近记录**：关闭所有页签后自动进入主页，快捷管理最近打开的文件与文件夹。
- [x] **未保存安全防御**：关闭未保存页签时弹出【取消 / 不保存 / 保存】提示，若选择不保存则彻底从工作区移除。
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
    B --> G[📑 智能大纲导航]
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
| \`Ctrl + Shift + S\` | 另存为... (自动带入顶级标题) |
| \`Tab / Shift + Tab\` | 编辑器缩进 / 反向缩进 (支持单行与多行) |
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
    this.renderFileTree();
    this.renderOutline();
    this.renderCurrentMarkdown();
    this.updateStatusBar();

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

    const defaultName = this.extractSmartFilename(tab);

    // 关键规范：如果是临时文件关闭页签时提示保存，点保存后工作区不用切换成文件保存目录
    if (tab.isUntitled || !tab.path) {
      if (this.backend && this.backend.save_file_as_dialog) {
        this.backend.save_file_as_dialog(defaultName, tab.content, (resStr) => {
          try {
            const res = JSON.parse(resStr);
            if (res.success && res.path) {
              this.addRecentFile(res.path, res.name);
              // 工作区不切换，直接关闭页签
              this.forceCloseTab(targetId);
              this.showToast("已保存", "info", 1500);
            }
          } catch (e) {
            console.error("Save on close error:", e);
          }
        });
      } else {
        this.forceCloseTab(targetId);
        this.showToast("已保存 (演示模式)", "info", 1500);
      }
    } else {
      // 已有文件直接保存并关闭
      if (this.backend && this.backend.save_file) {
        this.backend.save_file(tab.path, tab.content, (resStr) => {
          this.forceCloseTab(targetId);
          this.showToast("已保存", "info", 1500);
        });
      } else {
        this.forceCloseTab(targetId);
        this.showToast("已保存 (演示模式)", "info", 1500);
      }
    }
  }

  forceCloseTab(tabId) {
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex === -1) return;

    this.tabs.splice(tabIndex, 1);

    if (this.tabs.length === 0) {
      this.showHomeDashboard();
      return;
    }

    if (this.activeTabId === tabId) {
      const nextTab = this.tabs[Math.max(0, tabIndex - 1)] || this.tabs[0];
      this.switchTab(nextTab.id);
    } else {
      this.renderTabs();
      this.renderFileTree();
      this.renderOutline();
    }
  }

  renderTabs() {
    this.dom.tabsContainer.innerHTML = "";

    this.tabs.forEach(tab => {
      const tabEl = document.createElement("div");
      tabEl.className = "tab-item" + (tab.id === this.activeTabId ? " active" : "");
      tabEl.onclick = () => this.switchTab(tab.id);

      tabEl.innerHTML = `
        <svg class="tab-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
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

  // ==================== 文件与工作区 IO & 智能文件名 ====================

  extractSmartFilename(tab) {
    if (!tab || !tab.content || tab.content.trim() === "") {
      return tab && tab.name ? tab.name : I18N[this.lang].untitled;
    }

    const headings = this.extractHeadings(tab.content);
    if (headings.length > 0) {
      // 优先最高级别标题（H1 优先，其次 H2、H3...）
      const sorted = [...headings].sort((a, b) => a.level - b.level);
      const topHeading = sorted[0];
      if (topHeading && topHeading.text) {
        // 清理 Windows 文件名非法字符 \ / : * ? " < > | 及多余空白
        let cleanName = topHeading.text
          .replace(/[\\/:*?"<>|\r\n\t]/g, "")
          .trim();
        if (cleanName.length > 50) {
          cleanName = cleanName.substring(0, 50).trim();
        }
        if (cleanName) {
          return cleanName.toLowerCase().endsWith(".md") ? cleanName : `${cleanName}.md`;
        }
      }
    }

    return tab.isUntitled ? I18N[this.lang].untitled : tab.name;
  }

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
      this.renderOutline();
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
    const defaultName = this.extractSmartFilename(tab);

    if (this.backend && this.backend.save_file_as_dialog) {
      this.backend.save_file_as_dialog(defaultName, tab.content, (resStr) => {
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
            this.renderOutline();
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
      tab.path = "notesapp/" + defaultName;
      tab.name = defaultName;
      tab.isUntitled = false;
      tab.isDirty = false;
      this.renderTabs();
      this.renderFileTree();
      this.renderOutline();
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

  // ==================== 侧边栏文件树与临时文件展示 ====================

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

      // 临时文件与文件夹目录之间的分割线
      const divider = document.createElement("div");
      divider.className = "sidebar-tree-divider";
      treeEl.appendChild(divider);
    }

    // 2. 渲染文件夹树结构
    if (this.workspaceData.children) {
      this.workspaceData.children.forEach(item => {
        treeEl.appendChild(this.createTreeNodeElement(item));
      });
    }
  }

  createTreeNodeElement(item) {
    const container = document.createElement("div");

    const nodeEl = document.createElement("div");
    const activeTab = this.getActiveTab();
    const isCurrentActive = activeTab && activeTab.path === item.path;
    nodeEl.className = "tree-node" + (isCurrentActive ? " active" : "");

    let chevronHtml = `<span class="node-spacer"></span>`;
    let iconHtml = "";

    if (item.isDir) {
      chevronHtml = `
        <span class="node-chevron">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </span>
      `;
      iconHtml = `
        <span class="node-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </span>
      `;
    } else {
      const ext = item.ext ? item.ext.toLowerCase() : "";
      if (ext === ".md" || ext === ".markdown" || ext === ".txt") {
        iconHtml = `
          <span class="node-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </span>
        `;
      } else {
        iconHtml = `
          <span class="node-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
            </svg>
          </span>
        `;
      }
    }

    nodeEl.innerHTML = `
      ${chevronHtml}
      ${iconHtml}
      <span class="tree-node-name" title="${item.name}">${item.name}</span>
    `;

    // 右键上下文菜单
    nodeEl.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY, item);
    };

    if (item.isDir) {
      const childrenContainer = document.createElement("div");
      childrenContainer.className = "tree-children";
      if (item.children) {
        item.children.forEach(child => {
          childrenContainer.appendChild(this.createTreeNodeElement(child));
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
      nodeEl.onclick = (e) => {
        e.stopPropagation();
        this.openFileByPath(item.path, item.name);
      };
      container.appendChild(nodeEl);
    }

    return container;
  }

  // ==================== 工作区大纲 (TOC) 引擎 ====================

  toggleOutline() {
    this.isOutlineOpen = !this.isOutlineOpen;
    if (this.isOutlineOpen) {
      if (this.isSidebarCollapsed) this.toggleSidebar();
      this.dom.sidebarOutline.style.display = "flex";
      this.dom.outlineSplitter.style.display = "block";
      const sidebarH = this.dom.sidebar.clientHeight;
      if (!this.dom.sidebarOutline.style.height || parseInt(this.dom.sidebarOutline.style.height) < 60) {
        this.dom.sidebarOutline.style.height = Math.round(sidebarH * 0.5) + "px";
      }
      this.renderOutline();
      if (this.dom.floatingOutlineBtn) this.dom.floatingOutlineBtn.classList.add("active");
      if (this.dom.btnSidebarOutline) this.dom.btnSidebarOutline.classList.add("active");
    } else {
      this.dom.sidebarOutline.style.display = "none";
      this.dom.outlineSplitter.style.display = "none";
      if (this.dom.floatingOutlineBtn) this.dom.floatingOutlineBtn.classList.remove("active");
      if (this.dom.btnSidebarOutline) this.dom.btnSidebarOutline.classList.remove("active");
    }
  }

  initOutlineDrag() {
    const splitter = this.dom.outlineSplitter;
    const outline = this.dom.sidebarOutline;
    const sidebar = this.dom.sidebar;
    let isDragging = false;

    splitter.onmousedown = (e) => {
      isDragging = true;
      splitter.classList.add("dragging");
      document.body.style.cursor = "row-resize";
      e.preventDefault();
    };

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const sidebarRect = sidebar.getBoundingClientRect();
      const newHeight = sidebarRect.bottom - e.clientY;
      const minHeight = 60;
      const maxHeight = Math.round(sidebarRect.height * 0.666); // 最多占 2/3

      if (newHeight >= minHeight && newHeight <= maxHeight) {
        outline.style.height = `${newHeight}px`;
      }
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        splitter.classList.remove("dragging");
        document.body.style.cursor = "";
      }
    });
  }

  extractHeadings(markdownText) {
    if (!markdownText) return [];
    const lines = markdownText.split("\n");
    const headings = [];
    let inCodeBlock = false;
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        charOffset += line.length + 1;
        continue;
      }

      if (!inCodeBlock) {
        const atxMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (atxMatch) {
          const level = atxMatch[1].length;
          let text = atxMatch[2].trim();
          text = text.replace(/[*_~`]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
          headings.push({
            level,
            text,
            lineIndex: i,
            charIndex: charOffset
          });
        } else if (i < lines.length - 1) {
          const nextLine = lines[i + 1].trim();
          if (trimmed && !trimmed.startsWith("#")) {
            if (/^=+$/.test(nextLine)) {
              headings.push({
                level: 1,
                text: trimmed.replace(/[*_~`]/g, ""),
                lineIndex: i,
                charIndex: charOffset
              });
            } else if (/^-+$/.test(nextLine) && !trimmed.startsWith("-") && !trimmed.startsWith("*")) {
              headings.push({
                level: 2,
                text: trimmed.replace(/[*_~`]/g, ""),
                lineIndex: i,
                charIndex: charOffset
              });
            }
          }
        }
      }
      charOffset += line.length + 1;
    }
    return headings;
  }

  renderOutline() {
    if (!this.isOutlineOpen) return;
    const treeEl = this.dom.outlineTree;
    treeEl.innerHTML = "";

    const tab = this.getActiveTab();
    if (!tab || !tab.content || tab.content.trim() === "") {
      treeEl.innerHTML = `<div class="outline-empty">${I18N[this.lang].noOutline}</div>`;
      return;
    }

    const headings = this.extractHeadings(tab.content);
    if (headings.length === 0) {
      treeEl.innerHTML = `<div class="outline-empty">${I18N[this.lang].noOutline}</div>`;
      return;
    }

    headings.forEach(h => {
      const node = document.createElement("div");
      node.className = `outline-node level-${h.level}`;
      node.title = `H${h.level} - ${h.text}`;
      node.innerHTML = `
        <span class="outline-node-badge">H${h.level}</span>
        <span class="outline-node-text">${h.text}</span>
      `;
      node.onclick = () => this.scrollToHeading(h, node);
      treeEl.appendChild(node);
    });
  }

  scrollToHeading(heading, nodeEl) {
    if (nodeEl) {
      this.dom.outlineTree.querySelectorAll(".outline-node").forEach(n => n.classList.remove("active"));
      nodeEl.classList.add("active");
    }

    // 1. 在预览区滚动
    const preview = this.dom.previewContent;
    const headingEls = preview.querySelectorAll("h1, h2, h3, h4, h5, h6");
    let targetEl = null;

    for (const el of headingEls) {
      const cleanText = el.innerText.trim().replace(/[*_~`]/g, "").toLowerCase();
      if (cleanText === heading.text.trim().toLowerCase()) {
        targetEl = el;
        break;
      }
    }

    if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // 2. 在编辑区滚动
    const textarea = this.dom.editorTextarea;
    if (textarea && this.mode !== "preview") {
      const lines = textarea.value.split("\n");
      let pos = 0;
      for (let i = 0; i < Math.min(heading.lineIndex, lines.length); i++) {
        pos += lines[i].length + 1;
      }
      textarea.focus();
      textarea.setSelectionRange(pos, pos + (lines[heading.lineIndex] ? lines[heading.lineIndex].length : 0));
      const lineHeight = 22;
      textarea.scrollTop = heading.lineIndex * lineHeight;
    }
  }

  // ==================== Tab 键缩进核心 ====================

  initTabIndentation() {
    const textarea = this.dom.editorTextarea;
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const tabSpaces = "  "; // 标准 2 空格缩进

        if (start === end) {
          // 单光标
          if (!e.shiftKey) {
            textarea.value = value.substring(0, start) + tabSpaces + value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + tabSpaces.length;
          } else {
            // Shift+Tab: 反向缩进当前行
            const lineStart = value.lastIndexOf("\n", start - 1) + 1;
            if (value.substring(lineStart, lineStart + 2) === tabSpaces) {
              textarea.value = value.substring(0, lineStart) + value.substring(lineStart + 2);
              textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 2);
            } else if (value.charAt(lineStart) === " " || value.charAt(lineStart) === "\t") {
              textarea.value = value.substring(0, lineStart) + value.substring(lineStart + 1);
              textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - 1);
            }
          }
        } else {
          // 多行选中文本批量缩进
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          let lineEnd = value.indexOf("\n", end);
          if (lineEnd === -1) lineEnd = value.length;

          const selectedText = value.substring(lineStart, lineEnd);
          const lines = selectedText.split("\n");

          if (!e.shiftKey) {
            // 批量缩进
            const indented = lines.map(line => tabSpaces + line).join("\n");
            textarea.value = value.substring(0, lineStart) + indented + value.substring(lineEnd);
            textarea.selectionStart = start + tabSpaces.length;
            textarea.selectionEnd = lineEnd + (lines.length * tabSpaces.length);
          } else {
            // 批量反向缩进
            let removedCount = 0;
            const outdented = lines.map(line => {
              if (line.startsWith(tabSpaces)) {
                removedCount += 2;
                return line.substring(2);
              } else if (line.startsWith(" ") || line.startsWith("\t")) {
                removedCount += 1;
                return line.substring(1);
              }
              return line;
            }).join("\n");
            textarea.value = value.substring(0, lineStart) + outdented + value.substring(lineEnd);
            textarea.selectionStart = Math.max(lineStart, start - (lines[0].startsWith(tabSpaces) ? 2 : (lines[0].startsWith(" ") ? 1 : 0)));
            textarea.selectionEnd = lineEnd - removedCount;
          }
        }

        this.handleEditorInput();
      }
    });
  }

  // ==================== Markdown 语法速查指南 ====================

  openMarkdownCheatSheet() {
    const title = I18N[this.lang].cheatSheetTitle;
    const existing = this.tabs.find(t => t.name === title);
    if (existing) {
      this.switchTab(existing.id);
      return;
    }

    const cheatSheetContent = `# 📖 MiniMark - Markdown 全景语法速查指南

> 欢迎使用 **MiniMark**！本文档全面展示了 Markdown 标准排版语法、KaTeX 数学公式、Mermaid 图表引擎以及代码高亮规范。

---

## 1. 标题层级 (Headings)

# 一级标题 (H1)
## 二级标题 (H2)
### 三级标题 (H3)
#### 四级标题 (H4)
##### 五级标题 (H5)
###### 六级标题 (H6)

---

## 2. 文本格式与强调 (Typography)

- **粗体文字**：\`**粗体**\` 或 \`__粗体__\`
- *斜体文字*：\`*斜体*\` 或 \`_斜体_\`
- ***粗斜体文字***：\`***粗斜体***\`
- ~~删除线文字~~：\`~~删除线~~\`
- \`行内代码 (Inline Code)\`：\`\` \`code\` \`\`
- <u>下划线文本</u>：\`<u>下划线文本</u>\`

---

## 3. 列表与任务清单 (Lists & Tasks)

### 无序列表
- 极简无干扰纯净设计
  - 自动跟随系统深浅色模式
  - 支持多标签无缝切换
- 100% 纯本地离线架构

### 有序列表
1. 打开本地工作区文件夹 (\`Ctrl+K Ctrl+O\`)
2. 自由书写与双栏对照实时渲染
3. 智能提取顶级标题快速保存 (\`Ctrl+S\`)

### 任务复选框 (可在预览区直接勾选联动)
- [x] 已完成功能模块
- [ ] 正在规划的任务
- [ ] 待验证的发布清单

---

## 4. 引用与嵌套引用 (Blockquotes)

> **极简理念**：去除一切冗余工具栏，让写作回归文字本身。
> 
> > 嵌套引用：沉浸式阅读与双栏实时同步。

---

## 5. 表格排版 (Tables)

| 快捷键 | 功能描述 | 视窗模式 | 触发操作 |
| :--- | :--- | :---: | ---: |
| \`Ctrl + N\` | 新建临时文档 | ✎ 纯编辑 | 立即编辑 |
| \`Ctrl + O\` | 打开本地文件 | 👁 纯查看 | 调出对话框 |
| \`Ctrl + S\` | 保存当前文档 | 全部模式 | 智能保存 |
| \`Ctrl + Shift + S\`| 另存为文件 | 全部模式 | 提取顶级标题 |
| \`Tab / Shift+Tab\` | 缩进与反缩进 | ✎ / ◫ | 2 空格调整 |

---

## 6. 代码高亮与复制 (Code Blocks)

\`\`\`python
import sys
from typing import List

class MiniMarkCore:
    def __init__(self, version: str = "2.0.0"):
        self.version = version
        print(f"MiniMark v{self.version} Initialized successfully!")

    def parse_markdown(self, source: str) -> str:
        return f"Rendered length: {len(source)}"

if __name__ == "__main__":
    app = MiniMarkCore()
\`\`\`

\`\`\`javascript
// 前端双向平滑同步滚动
function syncScroll(source, target) {
  const percentage = source.scrollTop / (source.scrollHeight - source.clientHeight);
  target.scrollTop = percentage * (target.scrollHeight - target.clientHeight);
}
\`\`\`

---

## 7. KaTeX 科学数学公式 (Math Formulas)

### 行内公式 (Inline Math)
质能方程：$E = mc^2$，以及欧拉恒等式：$e^{i\\pi} + 1 = 0$。

### 独立块级公式 (Block Math)
高斯积分与极限展开：

$$ \\int_{-\\infty}^{+\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi} $$

多元泰勒展开式：

$$ f(x) = f(a) + f'(a)(x - a) + \\frac{f''(a)}{2!}(x - a)^2 + \\dots + \\frac{f^{(n)}(a)}{n!}(x - a)^n + R_n(x) $$

---

## 8. Mermaid 图表引擎 (Diagrams)

### 流程图 (Flowchart)
\`\`\`mermaid
graph TD
    Start[🚀 启动 MiniMark] --> ModeCheck{视窗模式}
    ModeCheck -->|👁 仅查看| ViewMode[Typora 沉浸式阅读]
    ModeCheck -->|◫ 双栏| SplitMode[左右实时双向联动]
    ModeCheck -->|✎ 仅编辑| EditMode[全宽代码极速录入]
    SplitMode --> Save[💾 智能标题保存]
\`\`\`

### 时序图 (Sequence Diagram)
\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as 用户
    participant UI as 前端视图 (WebEngine)
    participant Core as Qt 后端 (PySide6)
    
    User->>UI: 点击【大纲】按钮
    UI->>UI: 解析文档 H1~H6 标题
    UI->>UI: 在工作区底部展开 1/2 高度
    User->>UI: 点击某章节标题
    UI->>UI: 平滑居中滚动至对应内容
\`\`\`

---

> 💡 **提示**：您可以随时在右上角切换模式胶囊，查看本文件的纯排版效果或双栏对比！
`;

    this.createTab(title, cheatSheetContent, null, false);
    if (this.mode === "edit") {
      this.setMode("split");
    }
  }

  // ==================== 右键上下文菜单 ====================

  showContextMenu(x, y, targetItem) {
    this.contextTarget = targetItem;
    const menu = this.dom.contextMenu;
    menu.style.display = "block";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }

  hideContextMenu() {
    this.dom.contextMenu.style.display = "none";
    this.contextTarget = null;
  }

  // ==================== 侧边栏折叠 ====================

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.dom.sidebar.classList.toggle("collapsed", this.isSidebarCollapsed);
  }

  // ==================== 编辑器输入与 Markdown 渲染 ====================

  handleEditorInput() {
    const tab = this.getActiveTab();
    if (!tab) return;

    tab.content = this.dom.editorTextarea.value;
    tab.isDirty = tab.content !== tab.originalContent;
    this.renderTabs();
    this.renderCurrentMarkdown();
    this.updateStatusBar();

    // 防抖同步大纲
    clearTimeout(this.outlineDebounceTimer);
    this.outlineDebounceTimer = setTimeout(() => {
      this.renderOutline();
    }, 250);
  }

  renderCurrentMarkdown() {
    const tab = this.getActiveTab();
    if (!tab) {
      this.dom.previewContent.innerHTML = "";
      return;
    }

    if (window.marked) {
      try {
        const rawHtml = marked.parse(tab.content || "");
        this.dom.previewContent.innerHTML = rawHtml;
      } catch (err) {
        this.dom.previewContent.innerHTML = `<p style="color:red;">Markdown 解析错误: ${err.message}</p>`;
      }
    } else {
      this.dom.previewContent.innerText = tab.content || "";
    }

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
        m.classList.add("current");
        m.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        m.classList.remove("current");
      }
    });

    if (editorMatchIndices.length > 0 && currentIndex < editorMatchIndices.length && this.mode !== "preview") {
      const charIndex = editorMatchIndices[currentIndex];
      const textarea = this.dom.editorTextarea;
      textarea.focus();
      textarea.setSelectionRange(charIndex, charIndex + query.length);

      const linesBefore = textarea.value.substring(0, charIndex).split("\n").length;
      const lineHeight = 22;
      textarea.scrollTop = Math.max(0, (linesBefore * lineHeight) - (textarea.clientHeight / 2));
    }
  }

  findNext() {
    const total = Math.max(this.searchState.previewMarks.length, this.searchState.editorMatchIndices.length);
    if (total === 0) return;
    this.searchState.currentIndex = (this.searchState.currentIndex + 1) % total;
    this.updateActiveMatch();
  }

  findPrev() {
    const total = Math.max(this.searchState.previewMarks.length, this.searchState.editorMatchIndices.length);
    if (total === 0) return;
    this.searchState.currentIndex = (this.searchState.currentIndex - 1 + total) % total;
    this.updateActiveMatch();
  }

  replaceCurrent() {
    const { query, currentIndex } = this.searchState;
    const replaceText = this.dom.replaceInput.value;
    const tab = this.getActiveTab();
    if (!tab || !query || currentIndex < 0) return;

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "i");
    let count = 0;
    tab.content = tab.content.replace(new RegExp(regex, "g"), (match) => {
      if (count === currentIndex) {
        count++;
        return replaceText;
      }
      count++;
      return match;
    });

    this.dom.editorTextarea.value = tab.content;
    this.handleEditorInput();
    this.handleSearch(query);
  }

  replaceAll() {
    const { query } = this.searchState;
    const replaceText = this.dom.replaceInput.value;
    const tab = this.getActiveTab();
    if (!tab || !query) return;

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi");
    tab.content = tab.content.replace(regex, replaceText);
    this.dom.editorTextarea.value = tab.content;
    this.handleEditorInput();
    this.handleSearch(query);
    this.showToast("已完成全部替换", "info", 1500);
  }

  // ==================== 编辑器与预览区双向平滑同步滚动 ====================

  initScrollSync() {
    const editor = this.dom.editorTextarea;
    const preview = this.dom.previewContainer;

    editor.addEventListener("scroll", () => {
      if (this.mode !== "split" || this.isSyncingScroll) return;
      this.isSyncingScroll = true;

      const editorScrollable = editor.scrollHeight - editor.clientHeight;
      if (editorScrollable > 0) {
        const percentage = editor.scrollTop / editorScrollable;
        const previewScrollable = preview.scrollHeight - preview.clientHeight;
        preview.scrollTop = percentage * previewScrollable;
      }

      setTimeout(() => { this.isSyncingScroll = false; }, 40);
    });

    preview.addEventListener("scroll", () => {
      if (this.mode !== "split" || this.isSyncingScroll) return;
      this.isSyncingScroll = true;

      const previewScrollable = preview.scrollHeight - preview.clientHeight;
      if (previewScrollable > 0) {
        const percentage = preview.scrollTop / previewScrollable;
        const editorScrollable = editor.scrollHeight - editor.clientHeight;
        editor.scrollTop = percentage * editorScrollable;
      }

      setTimeout(() => { this.isSyncingScroll = false; }, 40);
    });
  }

  // ==================== 状态栏更新 ====================

  updateStatusBar() {
    const tab = this.getActiveTab();
    const t = I18N[this.lang];

    if (!tab) {
      this.dom.statusPath.innerText = "MiniMark";
      this.dom.statusStats.innerText = `0 ${t.statusLines} | 0 ${t.statusWords} | 0 ${t.statusChars}`;
      this.dom.statusMode.innerText = `${t.statusMode}: ${t.modePreview}`;
      return;
    }

    this.dom.statusPath.innerText = tab.path ? tab.path : tab.name;

    const text = tab.content || "";
    const lines = text ? text.split("\n").length : 0;
    const chars = text.length;
    const words = (text.match(/[\u4e00-\u9fa5]|\b\w+\b/g) || []).length;

    this.dom.statusStats.innerText = `${lines} ${t.statusLines} | ${words} ${t.statusWords} | ${chars} ${t.statusChars}`;

    let modeName = t.modePreview;
    if (this.mode === "edit") modeName = t.modeEdit;
    if (this.mode === "split") modeName = t.modeSplit;
    this.dom.statusMode.innerText = `${t.statusMode}: ${modeName}`;
  }

  // ==================== 事件与全局快捷键 ====================

  initEventListeners() {
    this.dom.modeCapsule.addEventListener("click", (e) => this.toggleCapsule(e));
    this.dom.editorTextarea.addEventListener("input", () => this.handleEditorInput());

    document.addEventListener("click", (e) => {
      if (!this.dom.modeCapsule.contains(e.target)) {
        this.closeCapsule();
      }
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
