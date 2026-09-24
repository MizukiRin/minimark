# -*- coding: utf-8 -*-
"""
MiniMark Backend - QtWebChannel Bridge (Root Proxy)
将 QWebChannel 调用转发至 core/ 核心业务模块。
"""

import os
import sys
import json
from pathlib import Path

from core import FileManager, WorkspaceManager, SystemHelper, AppRegistrar
from PySide6.QtCore import QObject, Slot, Signal
from PySide6.QtWidgets import QFileDialog


class MiniMarkBackend(QObject):
    """QtWebChannel 桥接类，暴露给前端 JS 调用"""

    themeChanged = Signal(str)
    fileOpened = Signal(str)
    folderOpened = Signal(str)

    def __init__(self, main_window=None):
        super().__init__()
        self.main_window = main_window
        self.current_workspace = ""

    # ==================== 系统主题、注册与环境 ====================

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

    @Slot(result=str)
    def get_app_registration_info(self) -> str:
        """获取 Windows 应用程序注册与关联状态"""
        return json.dumps(AppRegistrar.get_status_report(is_lite=False))

    @Slot(result=str)
    def register_windows_app(self) -> str:
        """注册为 Windows 应用程序并更新打开方式"""
        success, msg = AppRegistrar.register(is_lite=False, notify_explorer=True)
        return json.dumps({
            "success": success,
            "message": msg,
            "status": AppRegistrar.get_status_report(is_lite=False)
        })

    @Slot(result=str)
    def unregister_windows_app(self) -> str:
        """从 Windows 注册表中注销并清理所有关联"""
        success, msg = AppRegistrar.unregister(is_lite=False, notify_explorer=True)
        return json.dumps({
            "success": success,
            "message": msg,
            "status": AppRegistrar.get_status_report(is_lite=False)
        })

    # ==================== 文件操作 ====================

    @Slot(result=str)
    def open_file_dialog(self) -> str:
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
        return json.dumps(FileManager.read_file(file_path))

    @Slot(str, str, result=str)
    def save_file(self, file_path: str, content: str) -> str:
        return json.dumps(FileManager.save_file(file_path, content))

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
        return json.dumps(WorkspaceManager.get_folder_tree(self.current_workspace))

    @Slot(str, str, result=str)
    def create_file(self, dir_path: str, filename: str) -> str:
        return json.dumps(WorkspaceManager.create_file(dir_path, filename))

    @Slot(str, str, result=str)
    def create_folder(self, dir_path: str, folder_name: str) -> str:
        return json.dumps(WorkspaceManager.create_folder(dir_path, folder_name))

    @Slot(str, str, result=str)
    def rename_path(self, old_path: str, new_name: str) -> str:
        return json.dumps(WorkspaceManager.rename_path(old_path, new_name))

    @Slot(str, result=str)
    def delete_path(self, target_path: str) -> str:
        return json.dumps(WorkspaceManager.delete_path(target_path))

    @Slot(str, result=bool)
    def reveal_in_explorer(self, target_path: str) -> bool:
        return SystemHelper.reveal_in_explorer(target_path)

    # ==================== 导出渲染文档 (HTML / PDF) ====================

    @Slot(str, str, result=str)
    def export_html(self, default_name: str, html_content: str) -> str:
        default_path = os.path.join(self.current_workspace or os.path.expanduser("~"), default_name or "Exported.html")
        file_path, _ = QFileDialog.getSaveFileName(
            self.main_window,
            "导出为 HTML",
            default_path,
            "HTML 文件 (*.html *.htm);;所有文件 (*.*)"
        )
        if not file_path:
            return json.dumps({"success": False, "cancelled": True})
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            return json.dumps({"success": True, "path": file_path.replace("\\", "/"), "name": os.path.basename(file_path)})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    @Slot(str, result=str)
    def export_pdf(self, default_name: str) -> str:
        default_path = os.path.join(self.current_workspace or os.path.expanduser("~"), default_name or "Exported.pdf")
        file_path, _ = QFileDialog.getSaveFileName(
            self.main_window,
            "导出为 PDF",
            default_path,
            "PDF 文件 (*.pdf);;所有文件 (*.*)"
        )
        if not file_path:
            return json.dumps({"success": False, "cancelled": True})
        try:
            from PySide6.QtGui import QPageLayout, QPageSize
            from PySide6.QtCore import QMarginsF

            # 黄金比例舒适阅读页边距：上 20mm、下 20mm、左 18mm、右 18mm (A4 纵向)
            layout = QPageLayout(
                QPageSize(QPageSize.PageSizeId.A4),
                QPageLayout.Orientation.Portrait,
                QMarginsF(18.0, 20.0, 18.0, 20.0),
                QPageLayout.Unit.Millimeter
            )

            target_page = getattr(self.main_window, "browser", None)
            if target_page and hasattr(target_page, "page"):
                target_page.page().printToPdf(file_path, layout)
            elif hasattr(self.main_window, "page"):
                self.main_window.page.printToPdf(file_path, layout)
            else:
                return json.dumps({"success": False, "error": "无法获取浏览器页面进行 PDF 渲染"})
            return json.dumps({"success": True, "path": file_path.replace("\\", "/"), "name": os.path.basename(file_path)})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    # ==================== Windows 应用注册与关联管理 ====================

    @Slot(result=str)
    def get_app_registration_info(self) -> str:
        from core import AppRegistrar
        info = AppRegistrar.get_status_report(is_lite=False)
        return json.dumps(info)

    @Slot(result=str)
    def register_windows_app(self) -> str:
        from core import AppRegistrar
        success, msg = AppRegistrar.register(is_lite=False, notify_explorer=True)
        return json.dumps({"success": success, "message": msg})

    @Slot(result=str)
    def unregister_windows_app(self) -> str:
        from core import AppRegistrar
        success, msg = AppRegistrar.unregister(is_lite=False, notify_explorer=True)
        return json.dumps({"success": success, "message": msg})


