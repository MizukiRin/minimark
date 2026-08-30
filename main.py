# -*- coding: utf-8 -*-
"""
MiniMark - 极简 Windows 桌面 Markdown 编辑与查看器
主程序入口：基于 PySide6 + QWebEngineView + QtWebChannel
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

from backend import MiniMarkBackend


def get_resource_path(relative_path):
    """获取资源文件绝对路径（兼容开发环境与 PyInstaller 打包环境）"""
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, relative_path)
    base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)


class CustomWebEnginePage(QWebEnginePage):
    """自定义 WebEnginePage 以支持 JS 控制台输出调试"""
    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        # 如需在终端查看前端 log 可开启
        # print(f"[JS {level.name}] {message} ({sourceID}:{lineNumber})")
        pass


class MiniMarkWindow(QMainWindow):
    """MiniMark 主窗口"""

    def __init__(self, initial_path=None):
        super().__init__()
        self.setWindowTitle("MiniMark")
        self.resize(1180, 780)
        self.setMinimumSize(800, 560)

        # 设置窗口图标
        icon_path = get_resource_path(os.path.join("assets", "app.ico"))
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

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

        # 注册 QtWebChannel 与 Python 后端
        self.channel = QWebChannel(self)
        self.backend = MiniMarkBackend(self)
        self.channel.registerObject("backend", self.backend)
        self.browser.page().setWebChannel(self.channel)

        # 监听系统深浅色主题变化
        self.last_system_theme = self.backend.get_system_theme()
        self.theme_timer = QTimer(self)
        self.theme_timer.timeout.connect(self.check_system_theme_change)
        self.theme_timer.start(1000) # 每 1 秒轮询检测系统主题变化

        # 加载前端页面
        html_path = get_resource_path(os.path.join("ui", "index.html"))
        self.browser.setUrl(QUrl.fromLocalFile(html_path))

        # 若启动时传入了文件或目录参数，页面加载完成后通知前端打开
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
            # 打开文件夹
            js_code = f"window.app && window.app.loadWorkspace('{abs_path}');"
            self.browser.page().runJavaScript(js_code)
        elif os.path.isfile(self.initial_path):
            # 打开文件
            js_code = f"window.app && window.app.openFileByPath('{abs_path}');"
            self.browser.page().runJavaScript(js_code)


def main():
    # 启用高 DPI 缩放
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    
    app = QApplication(sys.argv)
    app.setApplicationName("MiniMark")
    app.setOrganizationName("MizukiRin")

    icon_path = get_resource_path(os.path.join("assets", "app.ico"))
    if os.path.exists(icon_path):
        app.setWindowIcon(QIcon(icon_path))

    initial_path = sys.argv[1] if len(sys.argv) > 1 else None
    window = MiniMarkWindow(initial_path=initial_path)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
