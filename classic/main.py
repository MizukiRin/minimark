# -*- coding: utf-8 -*-
"""
MiniMark Classic - 极简 Windows 桌面 Markdown 编辑与查看器 (PySide6 原版)
"""

import sys
import os
from pathlib import Path
from PySide6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
from PySide6.QtCore import QUrl, QTimer
from PySide6.QtGui import QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEngineSettings, QWebEnginePage
from PySide6.QtWebChannel import QWebChannel

# 引入 classic 后端
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from backend import MiniMarkBackend


class CustomWebEnginePage(QWebEnginePage):
    """自定义 WebEnginePage 以支持 JS 控制台输出调试"""
    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        pass


class MiniMarkWindow(QMainWindow):
    """MiniMark 主窗口 (Classic PySide6)"""

    def __init__(self, initial_path=None):
        super().__init__()
        self.setWindowTitle("MiniMark")
        self.resize(1180, 780)
        self.setMinimumSize(800, 560)

        # 设置应用图标
        current_dir = os.path.dirname(os.path.abspath(__file__))
        ico_path = os.path.join(os.path.dirname(current_dir), "assets", "app.ico")
        if os.path.exists(ico_path):
            self.setWindowIcon(QIcon(ico_path))

        # 核心部件
        self.central_widget = QWidget(self)
        self.setCentralWidget(self.central_widget)
        self.layout = QVBoxLayout(self.central_widget)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.layout.setSpacing(0)

        # Web 视图
        self.browser = QWebEngineView(self)
        self.page = CustomWebEnginePage(self.browser)
        self.browser.setPage(self.page)
        self.layout.addWidget(self.browser)

        # 启用 Web 引擎配置
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.ScrollAnimatorEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptCanAccessClipboard, True)

        # 注册 QtWebChannel 与 Python 后端
        self.channel = QWebChannel(self)
        self.backend = MiniMarkBackend(self)
        self.channel.registerObject("backend", self.backend)
        self.browser.page().setWebChannel(self.channel)

        # 监听系统深浅色主题变化
        self.last_system_theme = self.backend.get_system_theme()
        self.theme_timer = QTimer(self)
        self.theme_timer.timeout.connect(self.check_system_theme_change)
        self.theme_timer.start(1000)

        # 加载公共前端页面
        html_path = os.path.join(os.path.dirname(current_dir), "ui", "index.html")
        self.browser.setUrl(QUrl.fromLocalFile(html_path))

        # 命令行传入路径处理
        self.initial_path = initial_path
        if self.initial_path and os.path.exists(self.initial_path):
            self.browser.loadFinished.connect(self.on_initial_load_finished)

    def check_system_theme_change(self):
        """轮询检测 Windows 系统深浅主题变化"""
        current_theme = self.backend.get_system_theme()
        if current_theme != self.last_system_theme:
            self.last_system_theme = current_theme
            self.backend.themeChanged.emit(current_theme)

    def on_initial_load_finished(self, ok):
        """主页面加载完毕后，若有命令行传入路径，则触发打开"""
        if not ok or not self.initial_path:
            return
        abs_path = os.path.abspath(self.initial_path).replace("\\", "/")
        if os.path.isdir(self.initial_path):
            js_code = f"window.app && window.app.loadWorkspace('{abs_path}');"
            self.browser.page().runJavaScript(js_code)
        elif os.path.isfile(self.initial_path):
            js_code = f"window.app && window.app.openFileByPath('{abs_path}');"
            self.browser.page().runJavaScript(js_code)


def main():
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    
    app = QApplication(sys.argv)
    app.setApplicationName("MiniMark")
    app.setOrganizationName("MiniMark")

    initial_path = sys.argv[1] if len(sys.argv) > 1 else None
    window = MiniMarkWindow(initial_path=initial_path)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
