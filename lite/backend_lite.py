# -*- coding: utf-8 -*-
"""
MiniMark Lite - pywebview Backend Bridge
轻量版后端桥接层：将前端 JS API 调用转发至 core/ 核心业务模块。
"""

import os
import sys
import json
import webview
from webview import FileDialog

# 添加父目录以引入 core 模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import FileManager, WorkspaceManager, SystemHelper, AppRegistrar


class MiniMarkLiteBackend:
    """pywebview JS API 桥接类，暴露给前端 JS window.pywebview.api 调用"""

    def __init__(self):
        self._window = None
        self._current_workspace = ""

    def set_window(self, window):
        self._window = window

    # ==================== 系统主题、注册与环境 ====================

    def get_system_theme(self) -> str:
        return SystemHelper.get_system_theme()

    def get_system_locale(self) -> str:
        return SystemHelper.get_system_locale()

    def set_window_title(self, title: str):
        if self._window:
            self._window.set_title(f"{title} - MiniMark" if title else "MiniMark")

    def get_app_registration_info(self) -> dict:
        """获取 Windows 应用程序注册与关联状态"""
        return AppRegistrar.get_status_report(is_lite=True)

    def register_windows_app(self) -> dict:
        """注册为 Windows 应用程序并更新打开方式"""
        success, msg = AppRegistrar.register(is_lite=True, notify_explorer=True)
        return {
            "success": success,
            "message": msg,
            "status": AppRegistrar.get_status_report(is_lite=True)
        }

    def unregister_windows_app(self) -> dict:
        """从 Windows 注册表中注销并清理所有关联"""
        success, msg = AppRegistrar.unregister(is_lite=True, notify_explorer=True)
        return {
            "success": success,
            "message": msg,
            "status": AppRegistrar.get_status_report(is_lite=True)
        }

    # ==================== 文件操作 ====================

    def open_file_dialog(self) -> dict:
        """弹出原生文件选择对话框并读取内容"""
        if not self._window:
            return {"success": False, "error": "窗口未初始化"}

        try:
            result = self._window.create_file_dialog(
                FileDialog.OPEN,
                directory=self._current_workspace or os.path.expanduser("~"),
                allow_multiple=False,
                file_types=('Markdown 文件 (*.md;*.markdown;*.mdown;*.mkd;*.txt)', '所有文件 (*.*)')
            )
            if not result or len(result) == 0:
                return {"success": False, "cancelled": True}

            file_path = result[0]
            return FileManager.read_file(file_path)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def read_file(self, file_path: str) -> dict:
        return FileManager.read_file(file_path)

    def save_file(self, file_path: str, content: str) -> dict:
        return FileManager.save_file(file_path, content)

    def save_file_as_dialog(self, default_name: str, content: str) -> dict:
        """弹出另存为对话框并保存"""
        if not self._window:
            return {"success": False, "error": "窗口未初始化"}

        try:
            result = self._window.create_file_dialog(
                FileDialog.SAVE,
                directory=self._current_workspace or os.path.expanduser("~"),
                save_filename=default_name or "Untitled.md",
                file_types=('Markdown 文件 (*.md;*.markdown;*.txt)', '所有文件 (*.*)')
            )
            if not result:
                return {"success": False, "cancelled": True}

            file_path = result if isinstance(result, str) else result[0]
            return FileManager.save_file(file_path, content)
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ==================== 工作区文件夹操作 ====================

    def open_folder_dialog(self) -> dict:
        """弹出文件夹选择对话框并返回目录树"""
        if not self._window:
            return {"success": False, "error": "窗口未初始化"}

        try:
            result = self._window.create_file_dialog(
                FileDialog.FOLDER,
                directory=self._current_workspace or os.path.expanduser("~")
            )
            if not result or len(result) == 0:
                return {"success": False, "cancelled": True}

            folder_path = result if isinstance(result, str) else result[0]
            self._current_workspace = os.path.abspath(folder_path)
            return WorkspaceManager.get_folder_tree(self._current_workspace)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_folder_tree(self, folder_path: str) -> dict:
        self._current_workspace = os.path.abspath(folder_path)
        return WorkspaceManager.get_folder_tree(self._current_workspace)

    def create_file(self, dir_path: str, filename: str) -> dict:
        return WorkspaceManager.create_file(dir_path, filename)

    def create_folder(self, dir_path: str, folder_name: str) -> dict:
        return WorkspaceManager.create_folder(dir_path, folder_name)

    def rename_path(self, old_path: str, new_name: str) -> dict:
        return WorkspaceManager.rename_path(old_path, new_name)

    def delete_path(self, target_path: str) -> dict:
        return WorkspaceManager.delete_path(target_path)

    def reveal_in_explorer(self, target_path: str) -> bool:
        return SystemHelper.reveal_in_explorer(target_path)


