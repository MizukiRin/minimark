# -*- coding: utf-8 -*-
"""
MiniMark Lite - 极简 Windows 桌面 Markdown 编辑与查看器 (pywebview + Edge WebView2 轻量版)
"""

import os
import sys
import time
import shutil
import threading
import webview

# 引入 lite 后端与 core 模块
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, current_dir)
sys.path.insert(0, parent_dir)

from backend_lite import MiniMarkLiteBackend
from core import SystemHelper, AppRegistrar


def get_resource_path(relative_path: str) -> str:
    """获取资源文件绝对路径（兼容开发环境、PyInstaller onedir/onefile 打包环境）"""
    candidates = []

    # 1. PyInstaller 运行环境内部解压/数据目录 (sys._MEIPASS，通常为 _internal)
    if hasattr(sys, "_MEIPASS"):
        candidates.append(sys._MEIPASS)

    # 2. 可执行文件同级目录及 _internal 目录（优先 _internal，确保更新覆盖时不被旧根目录文件干扰）
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        candidates.append(os.path.join(exe_dir, "_internal"))
        candidates.append(exe_dir)

    # 3. 源码开发环境 (包含 parent_dir 与 current_dir)
    candidates.append(parent_dir)
    candidates.append(current_dir)
    candidates.append(os.getcwd())

    for base in candidates:
        if base:
            full_path = os.path.abspath(os.path.join(base, relative_path))
            if os.path.exists(full_path):
                return full_path

    return os.path.abspath(os.path.join(parent_dir, relative_path))


def start_theme_watcher(window, stop_event):
    """后台监听 Windows 系统深浅色主题变化并分发事件到前端"""
    def worker():
        last_theme = SystemHelper.get_system_theme()
        while not stop_event.wait(1.0):
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
    # 命令行快速卸载处理（系统设置 -> 已安装应用中点击卸载时调用）
    if "--uninstall" in sys.argv or "--unregister" in sys.argv:
        try:
            import ctypes
            success, msg = AppRegistrar.unregister(is_lite=True)
            ctypes.windll.user32.MessageBoxW(0, msg, "MiniMark Lite", 0x40)
        except Exception as e:
            print("Uninstall error:", e)
        sys.exit(0)

    initial_path = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else None

    html_path = get_resource_path(os.path.join("ui", "index.html"))
    ico_path = get_resource_path(os.path.join("assets", "app.ico"))

    # 规范化文件 URL 并进行异常友好弹窗提示
    if not os.path.exists(html_path):
        import ctypes
        ctypes.windll.user32.MessageBoxW(
            0,
            f"未检测到 UI 核心界面文件：\n{html_path}\n\n【重要提示】：\n请勿单独把 exe 拖出！请将整个压缩包解压后，保持 exe 与 _internal 文件夹在同一目录下运行。",
            "MiniMark Lite 启动错误",
            0x10
        )
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

    stop_event = threading.Event()
    loaded_once = {"done": False}

    def on_closed():
        stop_event.set()

    def on_loaded():
        if loaded_once["done"]:
            return
        loaded_once["done"] = True

        # 启动主题监听
        start_theme_watcher(window, stop_event)

        # 异步执行 Windows 应用注册与移动自愈检测（极速 0.1ms，非阻塞）
        def do_reg_check():
            time.sleep(0.15)
            try:
                import json
                reg_res = AppRegistrar.check_and_heal(is_lite=True)
                res_json = json.dumps(reg_res)
                js_code = f"""
                (function notifyWhenReady(retries) {{
                    if (window.app && window.app.notifyRegistrationResult) {{
                        window.app.notifyRegistrationResult({res_json});
                    }} else if (retries > 0) {{
                        setTimeout(function() {{ notifyWhenReady(retries - 1); }}, 100);
                    }}
                }})(30);
                """
                window.evaluate_js(js_code)
            except Exception as e:
                print("Registration check error:", e)

        threading.Thread(target=do_reg_check, daemon=True).start()

        # 若有启动路径参数，异步触发打开（确保 DOMContentLoaded 和 JS bridge 握手就绪）
        if initial_path and os.path.exists(initial_path):
            def do_open_initial():
                time.sleep(0.2)
                try:
                    import json
                    abs_path = os.path.abspath(initial_path).replace("\\", "/")
                    clean_path = json.dumps(abs_path)
                    if os.path.isdir(initial_path):
                        js_code = f"""
                        (function openDirWhenReady(retries) {{
                            if (window.app && window.app.loadWorkspace) {{
                                window.app.loadWorkspace({clean_path});
                            }} else if (retries > 0) {{
                                setTimeout(function() {{ openDirWhenReady(retries - 1); }}, 100);
                            }}
                        }})(30);
                        """
                    else:
                        js_code = f"""
                        (function openFileWhenReady(retries) {{
                            if (window.app && window.app.openFileByPath) {{
                                window.app.openFileByPath({clean_path});
                            }} else if (retries > 0) {{
                                setTimeout(function() {{ openFileWhenReady(retries - 1); }}, 100);
                            }}
                        }})(30);
                        """
                    window.evaluate_js(js_code)
                except Exception as e:
                    print("Open initial path error:", e)

            threading.Thread(target=do_open_initial, daemon=True).start()

    window.events.loaded += on_loaded
    window.events.closed += on_closed

    # 本地数据持久化目录
    storage_path = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "MiniMark_Lite")

    _clear_stale_webview_cache(storage_path)
    _enable_no_cache_static_responses()

    webview.start(
        gui="edgechromium",
        private_mode=False,
        storage_path=storage_path,
        icon=ico_path if os.path.exists(ico_path) else None,
        debug=False
    )


def _clear_stale_webview_cache(storage_path: str):
    """清理 WebView2 HTTP 磁盘缓存与代码缓存，保留 Local Storage 等用户数据"""
    profile_dir = os.path.join(storage_path, "EBWebView", "Default")
    for cache_folder in ("Cache", "Code Cache"):
        target = os.path.join(profile_dir, cache_folder)
        if os.path.isdir(target):
            shutil.rmtree(target, ignore_errors=True)


def _enable_no_cache_static_responses():
    """修正 pywebview BottleServer 中 bottle.static_file 忽略 bottle.response 缓存头的问题"""
    import bottle
    if getattr(bottle.static_file, "_minimark_no_cache", False):
        return
    orig_static_file = bottle.static_file

    def _no_cache_static_file(*args, **kwargs):
        headers = dict(kwargs.get("headers") or {})
        headers.setdefault("Cache-Control", "no-cache, no-store, must-revalidate")
        headers.setdefault("Pragma", "no-cache")
        headers.setdefault("Expires", "0")
        kwargs["headers"] = headers
        if kwargs.get("etag") is None:
            kwargs["etag"] = False
        return orig_static_file(*args, **kwargs)

    _no_cache_static_file._minimark_no_cache = True
    bottle.static_file = _no_cache_static_file


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        import ctypes
        err_trace = traceback.format_exc()
        ctypes.windll.user32.MessageBoxW(
            0,
            f"MiniMark Lite 启动遇到异常：\n\n{err_trace}",
            "MiniMark Lite 异常捕获",
            0x10
        )
        sys.exit(1)

