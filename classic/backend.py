# -*- coding: utf-8 -*-
"""
MiniMark Classic - QtWebChannel Bridge
原版 PySide6 后端桥接层：将 QWebChannel 调用转发至 core/ 核心业务模块。
"""

import os
import sys
import json
from pathlib import Path

# 添加父目录以引入 core 模块
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import FileManager, WorkspaceManager, SystemHelper

from PySide6.QtCore import QObject, Slot, Signal
from PySide6.QtWidgets import QFileDialog


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
        return SystemHelper.get_system_theme()

    @Slot(result=str)
    def get_system_locale(self) -> str:
        return SystemHelper.get_system_locale()

    @Slot(str)
    def set_window_title(self, title: str):
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
        res = FileManager.read_file(file_path)
        return json.dumps(res)

    @Slot(str, str, result=str)
    def save_file(self, file_path: str, content: str) -> str:
        res = FileManager.save_file(file_path, content)
        return json.dumps(res)

    @Slot(str, str, result=str)
    def save_file_as_dialog(self, default_name: str, content: str) -> str:
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
        self.current_workspace = os.path.abspath(folder_path)
        res = WorkspaceManager.get_folder_tree(self.current_workspace)
        return json.dumps(res)

    @Slot(str, str, result=str)
    def create_file(self, dir_path: str, filename: str) -> str:
        res = WorkspaceManager.create_file(dir_path, filename)
        return json.dumps(res)

    @Slot(str, str, result=str)
    def create_folder(self, dir_path: str, folder_name: str) -> str:
        res = WorkspaceManager.create_folder(dir_path, folder_name)
        return json.dumps(res)

    @Slot(str, str, result=str)
    def rename_path(self, old_path: str, new_name: str) -> str:
        res = WorkspaceManager.rename_path(old_path, new_name)
        return json.dumps(res)

    @Slot(str, result=str)
    def delete_path(self, target_path: str) -> str:
        res = WorkspaceManager.delete_path(target_path)
        return json.dumps(res)

    @Slot(str, result=bool)
    def reveal_in_explorer(self, target_path: str) -> bool:
        return SystemHelper.reveal_in_explorer(target_path)
