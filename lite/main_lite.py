# -*- coding: utf-8 -*-
"""
MiniMark Lite - 极简 Windows 桌面 Markdown 编辑与查看器 (pywebview + Edge WebView2 轻量版)
"""

import os
import sys
import time
import threading
import webview

# 引入 lite 后端与 core 模块
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

from backend_lite import MiniMarkLiteBackend
from core import SystemHelper


def start_theme_watcher(window):
    """后台监听 Windows 系统深浅色主题变化并分发事件到前端"""
    def worker():
        last_theme = SystemHelper.get_system_theme()
        while True:
            time.sleep(1.0)
            try:
                current_theme = SystemHelper.get_system_theme()
                if current_theme != last_theme:
                    last_theme = current_theme
                    js_code = f"window.dispatchEvent(new CustomEvent('minimark-theme-changed', {{ detail: '{current_theme}' }}));"
                    window.evaluate_js(js_code)
            except Exception:
                break

    t = threading.Thread(target=worker, daemon=True)
    t.start()


def main():
    initial_path = sys.argv[1] if len(sys.argv) > 1 else None

    html_path = os.path.join(parent_dir, "ui", "index.html")
    ico_path = os.path.join(parent_dir, "assets", "app.ico")

    # 规范化文件 URL
    if not os.path.exists(html_path):
        print(f"Error: UI index.html not found at {html_path}")
        sys.exit(1)

    backend = MiniMarkLiteBackend()

    window = webview.create_window(
        title="MiniMark",
        url=html_path,
        js_api=backend,
        width=1180,
        height=780,
        min_size=(800, 560),
        text_select=True,
        easy_drag=False
    )
    backend.set_window(window)

    def on_loaded():
        # 启动主题监听
        start_theme_watcher(window)

        # 若有启动路径参数，触发打开
        if initial_path and os.path.exists(initial_path):
            abs_path = os.path.abspath(initial_path).replace("\\", "/")
            if os.path.isdir(initial_path):
                js_code = f"window.app && window.app.loadWorkspace('{abs_path}');"
                window.evaluate_js(js_code)
            elif os.path.isfile(initial_path):
                js_code = f"window.app && window.app.openFileByPath('{abs_path}');"
                window.evaluate_js(js_code)

    window.events.loaded += on_loaded

    # 本地数据持久化目录
    storage_path = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "MiniMark_Lite")

    webview.start(
        gui="edgechromium",
        private_mode=False,
        storage_path=storage_path,
        icon=ico_path if os.path.exists(ico_path) else None,
        debug=False
    )


if __name__ == "__main__":
    main()
