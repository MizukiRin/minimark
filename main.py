# -*- coding: utf-8 -*-
"""
MiniMark - 极简 Windows 桌面 Markdown 编辑与查看器
主程序入口：基于 PySide6 + QWebEngineView + QtWebChannel
"""

import sys
import os
from pathlib import Path
from PySide6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QMessageBox
from PySide6.QtCore import QUrl, QTimer
from PySide6.QtGui import QIcon
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEngineSettings, QWebEnginePage
from PySide6.QtWebChannel import QWebChannel

from backend import MiniMarkBackend


def get_resource_path(relative_path):
    """获取资源文件绝对路径（兼容开发环境与 PyInstaller 打包环境）"""
    candidates = []

    # 1. PyInstaller 内部解压/数据目录 (sys._MEIPASS)
    if hasattr(sys, "_MEIPASS"):
        candidates.append(sys._MEIPASS)

    # 2. 可执行文件同级目录及 _internal 目录（优先 _internal，确保更新覆盖时不被旧根目录文件干扰）
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        candidates.append(os.path.join(exe_dir, "_internal"))
        candidates.append(exe_dir)

    # 3. 源码开发环境
    base_path = os.path.dirname(os.path.abspath(__file__))
    candidates.append(base_path)
    candidates.append(os.path.dirname(base_path))
    candidates.append(os.getcwd())

    for base in candidates:
        if base:
            full_path = os.path.abspath(os.path.join(base, relative_path))
            if os.path.exists(full_path):
                return full_path

    return os.path.abspath(os.path.join(base_path, relative_path))


class CustomWebEnginePage(QWebEnginePage):
    """自定义 WebEnginePage 以支持 JS 控制台输出与原生弹窗本地化定制"""
    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        # 如需在终端查看前端 log 可开启
        # print(f"[JS {level.name}] {message} ({sourceID}:{lineNumber})")
        pass

    def javaScriptConfirm(self, securityOrigin, msg):
        """定制系统原生确认弹窗，统一窗口标题为 MiniMark 并显示中文确定/取消按钮"""
        parent = QApplication.activeWindow()
        msg_box = QMessageBox(parent)
        msg_box.setWindowTitle("MiniMark")
        msg_box.setText(msg)
        msg_box.setIcon(QMessageBox.Icon.Question)
        btn_ok = msg_box.addButton("确定", QMessageBox.ButtonRole.AcceptRole)
        btn_cancel = msg_box.addButton("取消", QMessageBox.ButtonRole.RejectRole)
        msg_box.setDefaultButton(btn_cancel)
        msg_box.exec()
        return msg_box.clickedButton() == btn_ok


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
        self.theme_timer.start(1000) # 每 1 秒轮询检测系统主题变化

        # 加载前端页面
        html_path = get_resource_path(os.path.join("ui", "index.html"))
        if not os.path.exists(html_path):
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                0,
                f"未检测到 UI 核心界面文件：\n{html_path}\n\n【重要提示】：\n请勿单独把 exe 拖出！请将整个压缩包解压后，保持 exe 与 _internal 文件夹在同一目录下运行。",
                "MiniMark 启动错误",
                0x10
            )
            sys.exit(1)
        self.browser.setUrl(QUrl.fromLocalFile(html_path))

        # 若启动时传入了文件或目录参数，页面加载完成后通知前端打开
        self.initial_path = initial_path
        self.browser.loadFinished.connect(self.on_load_finished)

    def check_system_theme_change(self):
        """轮询检测 Windows 系统深浅主题变化"""
        current_theme = self.backend.get_system_theme()
        if current_theme != self.last_system_theme:
            self.last_system_theme = current_theme
            self.backend.themeChanged.emit(current_theme)

    def on_load_finished(self, ok):
        """主页面加载完毕后的处理流程"""
        if not ok:
            return

        # 1. 异步执行 Windows 应用注册与移动自愈检测（极速 0.1ms，非阻塞）
        QTimer.singleShot(100, self.do_app_registration_check)

        # 2. 若有命令行传入路径，待 window.app 与 QWebChannel 均就绪后触发打开
        if self.initial_path and os.path.exists(self.initial_path):
            import json
            abs_path = os.path.abspath(self.initial_path).replace("\\", "/")
            clean_path = json.dumps(abs_path)
            method_name = "loadWorkspace" if os.path.isdir(self.initial_path) else "openFileByPath"
            js_code = f"""
            (function openInitialWhenReady(retries) {{
                if (window.app && window.backend && window.app.{method_name}) {{
                    window.app.{method_name}({clean_path});
                }} else if (retries > 0) {{
                    setTimeout(function() {{ openInitialWhenReady(retries - 1); }}, 100);
                }}
            }})(30);
            """
            QTimer.singleShot(150, lambda: self.browser.page().runJavaScript(js_code))

    def do_app_registration_check(self):
        """执行首次注册或路径自愈，并将结果同步到前端"""
        try:
            import json
            from core import AppRegistrar
            reg_res = AppRegistrar.check_and_heal(is_lite=False)
            res_json = json.dumps(reg_res)
            js_code = f"window.app && window.app.notifyRegistrationResult && window.app.notifyRegistrationResult({res_json});"
            self.browser.page().runJavaScript(js_code)
        except Exception as e:
            print("Registration check error:", e)


def main():
    # 命令行快速卸载处理（系统设置 -> 已安装应用中点击卸载时调用）
    if "--uninstall" in sys.argv or "--unregister" in sys.argv:
        try:
            import ctypes
            from core import AppRegistrar
            success, msg = AppRegistrar.unregister(is_lite=False)
            ctypes.windll.user32.MessageBoxW(0, msg, "MiniMark", 0x40)
        except Exception as e:
            print("Uninstall error:", e)
        sys.exit(0)

    # 启用高 DPI 缩放
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    
    app = QApplication(sys.argv)
    app.setApplicationName("MiniMark")
    app.setOrganizationName("MizukiRin")

    icon_path = get_resource_path(os.path.join("assets", "app.ico"))
    if os.path.exists(icon_path):
        app.setWindowIcon(QIcon(icon_path))

    initial_path = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else None
    window = MiniMarkWindow(initial_path=initial_path)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        import ctypes
        err_trace = traceback.format_exc()
        ctypes.windll.user32.MessageBoxW(
            0,
            f"MiniMark 启动遇到异常：\n\n{err_trace}",
            "MiniMark 异常捕获",
            0x10
        )
        sys.exit(1)

