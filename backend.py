# -*- coding: utf-8 -*-
"""
MiniMark Backend - QtWebChannel Bridge
提供与前端 JS 交互的本地文件操作、文件夹树解析、系统主题检测与窗口控制接口。
"""

import os
import sys
import json
import shutil
import locale
import subprocess
import winreg
from pathlib import Path
from PySide6.QtCore import QObject, Slot, Signal
from PySide6.QtWidgets import QFileDialog, QMessageBox


class MiniMarkBackend(QObject):
    """QtWebChannel 桥接类，暴露给前端 JS 调用"""

    # 信号定义
    themeChanged = Signal(str)       # 'dark' | 'light'
    fileOpened = Signal(str)         # 外部打开文件信号
    folderOpened = Signal(str)       # 外部打开目录信号

    def __init__(self, main_window=None):
        super().__init__()
        self.main_window = main_window
        self.current_workspace = ""

    # ==================== 系统主题与环境 ====================

    @Slot(result=str)
    def get_system_theme(self) -> str:
        """检测 Windows 系统的深浅色主题设置"""
        try:
            key_path = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path) as key:
                value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                return "light" if value == 1 else "dark"
        except Exception:
            return "light"

    @Slot(result=str)
    def get_system_locale(self) -> str:
        """获取系统语言设置 ('zh' 或 'en')"""
        try:
            loc = locale.getdefaultlocale()[0]
            if loc and loc.lower().startswith("zh"):
                return "zh"
        except Exception:
            pass
        return "en"

    @Slot(str)
    def set_window_title(self, title: str):
        """设置主窗口标题"""
        if self.main_window:
            self.main_window.setWindowTitle(f"{title} - MiniMark" if title else "MiniMark")

    # ==================== 文件操作 ====================

    @Slot(result=str)
    def open_file_dialog(self) -> str:
        """打开单文件选择对话框"""
        file_path, _ = QFileDialog.getOpenFileName(
            self.main_window,
            "打开 Markdown 文件",
            self.current_workspace or os.path.expanduser("~"),
            "Markdown 文件 (*.md *.markdown *.mdown *.mkd *.txt);;所有文件 (*.*)"
        )
        if not file_path:
            return json.dumps({"success": False, "cancelled": True})

        return self.read_file(file_path)

    @Slot(str, result=str)
    def read_file(self, file_path: str) -> str:
        """读取指定文件内容，智能处理编码"""
        try:
            normalized_path = os.path.abspath(file_path)
            if not os.path.isfile(normalized_path):
                return json.dumps({"success": False, "error": f"文件不存在: {normalized_path}"})

            content = None
            encodings = ["utf-8", "utf-8-sig", "gbk", "gb2312", "latin-1"]
            for enc in encodings:
                try:
                    with open(normalized_path, "r", encoding=enc) as f:
                        content = f.read()
                    break
                except UnicodeDecodeError:
                    continue

            if content is None:
                return json.dumps({"success": False, "error": "无法以支持的编码读取该文件"})

            name = os.path.basename(normalized_path)
            return json.dumps({
                "success": True,
                "path": normalized_path,
                "name": name,
                "dir": os.path.dirname(normalized_path),
                "content": content
            })
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, str, result=str)
    def save_file(self, file_path: str, content: str) -> str:
        """保存内容到指定路径，并返回路径与所在目录信息"""
        try:
            normalized_path = os.path.abspath(file_path)
            save_dir = os.path.dirname(normalized_path)
            os.makedirs(save_dir, exist_ok=True)
            with open(normalized_path, "w", encoding="utf-8") as f:
                f.write(content)
            return json.dumps({
                "success": True,
                "path": normalized_path,
                "name": os.path.basename(normalized_path),
                "dir": save_dir
            })
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, str, result=str)
    def save_file_as_dialog(self, default_name: str, content: str) -> str:
        """另存为对话框"""
        default_path = os.path.join(self.current_workspace or os.path.expanduser("~"), default_name or "Untitled.md")
        file_path, _ = QFileDialog.getSaveFileName(
            self.main_window,
            "另存为",
            default_path,
            "Markdown 文件 (*.md *.markdown);;所有文件 (*.*)"
        )
        if not file_path:
            return json.dumps({"success": False, "cancelled": True})

        return self.save_file(file_path, content)

    # ==================== 工作区文件夹操作 ====================

    @Slot(result=str)
    def open_folder_dialog(self) -> str:
        """打开文件夹选择对话框并返回目录树"""
        folder_path = QFileDialog.getExistingDirectory(
            self.main_window,
            "选择工作区文件夹",
            self.current_workspace or os.path.expanduser("~")
        )
        if not folder_path:
            return json.dumps({"success": False, "cancelled": True})

        self.current_workspace = os.path.abspath(folder_path)
        return self.get_folder_tree(self.current_workspace)

    @Slot(str, result=str)
    def get_folder_tree(self, folder_path: str) -> str:
        """递归生成指定工作区文件夹的目录树结构"""
        try:
            root_path = os.path.abspath(folder_path)
            if not os.path.isdir(root_path):
                return json.dumps({"success": False, "error": "目录不存在"})

            self.current_workspace = root_path

            def scan_dir(dir_path: str, max_depth: int = 5, current_depth: int = 0):
                if current_depth > max_depth:
                    return []
                items = []
                try:
                    entries = sorted(os.scandir(dir_path), key=lambda e: (not e.is_dir(), e.name.lower()))
                    for entry in entries:
                        if entry.name.startswith(".") or entry.name in ["__pycache__", "node_modules", "target", "dist", "build"]:
                            continue

                        item = {
                            "name": entry.name,
                            "path": entry.path,
                            "isDir": entry.is_dir()
                        }
                        if entry.is_dir():
                            item["children"] = scan_dir(entry.path, max_depth, current_depth + 1)
                        else:
                            ext = os.path.splitext(entry.name)[1].lower()
                            item["ext"] = ext
                        items.append(item)
                except PermissionError:
                    pass
                return items

            tree_data = {
                "name": os.path.basename(root_path) or root_path,
                "path": root_path,
                "isDir": True,
                "children": scan_dir(root_path)
            }
            return json.dumps({"success": True, "data": tree_data})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, str, result=str)
    def create_file(self, dir_path: str, filename: str) -> str:
        """在指定目录下新建文件"""
        try:
            target_path = os.path.abspath(os.path.join(dir_path, filename))
            if os.path.exists(target_path):
                return json.dumps({"success": False, "error": "同名文件已存在"})
            with open(target_path, "w", encoding="utf-8") as f:
                f.write("")
            return json.dumps({"success": True, "path": target_path, "name": filename, "dir": dir_path})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, str, result=str)
    def create_folder(self, dir_path: str, folder_name: str) -> str:
        """在指定目录下新建子目录"""
        try:
            target_path = os.path.abspath(os.path.join(dir_path, folder_name))
            if os.path.exists(target_path):
                return json.dumps({"success": False, "error": "同名文件夹已存在"})
            os.makedirs(target_path, exist_ok=True)
            return json.dumps({"success": True, "path": target_path, "name": folder_name, "dir": dir_path})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, str, result=str)
    def rename_path(self, old_path: str, new_name: str) -> str:
        """重命名文件或文件夹"""
        try:
            old_path = os.path.abspath(old_path)
            if not os.path.exists(old_path):
                return json.dumps({"success": False, "error": "目标路径不存在"})
            parent_dir = os.path.dirname(old_path)
            new_path = os.path.join(parent_dir, new_name)
            os.rename(old_path, new_path)
            return json.dumps({"success": True, "oldPath": old_path, "newPath": new_path, "name": new_name})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def delete_path(self, target_path: str) -> str:
        """删除文件或文件夹"""
        try:
            target_path = os.path.abspath(target_path)
            if not os.path.exists(target_path):
                return json.dumps({"success": False, "error": "目标路径不存在"})
            if os.path.isdir(target_path):
                shutil.rmtree(target_path)
            else:
                os.remove(target_path)
            return json.dumps({"success": True, "path": target_path})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=bool)
    def reveal_in_explorer(self, target_path: str) -> bool:
        """在 Windows 资源管理器中高亮显示文件"""
        try:
            target_path = os.path.abspath(target_path)
            if os.path.exists(target_path):
                subprocess.Popen(f'explorer /select,"{target_path}"')
                return True
        except Exception:
            pass
        return False
