# -*- coding: utf-8 -*-
"""
MiniMark Core - SystemHelper
负责 Windows 注册表主题与语言检测、调用系统资源管理器定位文件。
"""

import os
import locale
import subprocess
import winreg


class SystemHelper:
    """系统与环境集成助手"""

    @classmethod
    def get_system_theme(cls) -> str:
        """
        读取 Windows 注册表获取系统深浅色主题设置。
        返回 'light' | 'dark'
        """
        try:
            key_path = r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path) as key:
                value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                return "light" if value == 1 else "dark"
        except Exception:
            return "light"

    @classmethod
    def get_system_locale(cls) -> str:
        """
        获取系统默认语言设置。
        返回 'zh' | 'en'
        """
        try:
            loc = locale.getdefaultlocale()[0]
            if loc and loc.lower().startswith("zh"):
                return "zh"
        except Exception:
            pass
        return "en"

    @classmethod
    def reveal_in_explorer(cls, target_path: str) -> bool:
        """在 Windows 资源管理器中高亮选中指定文件或目录"""
        try:
            normalized_path = os.path.abspath(target_path)
            if os.path.exists(normalized_path):
                subprocess.Popen(f'explorer /select,"{normalized_path}"')
                return True
        except Exception:
            pass
        return False

    @classmethod
    def move_to_trash(cls, target_path: str) -> bool:
        """
        使用 Windows Shell 原生 API (SHFileOperationW) 将指定文件或文件夹移入回收站。
        返回 True 表示成功移入回收站，False 表示系统未支持或失败。
        """
        try:
            import ctypes
            from ctypes import wintypes

            class SHFILEOPSTRUCTW(ctypes.Structure):
                _fields_ = [
                    ("hwnd", wintypes.HWND),
                    ("wFunc", wintypes.UINT),
                    ("pFrom", wintypes.LPCWSTR),
                    ("pTo", wintypes.LPCWSTR),
                    ("fFlags", wintypes.WORD),
                    ("fAnyOperationsAborted", wintypes.BOOL),
                    ("hNameMappings", wintypes.LPVOID),
                    ("lpszProgressTitle", wintypes.LPCWSTR),
                ]

            FO_DELETE = 3
            FOF_ALLOWUNDO = 0x0040        # 移动到回收站（保留撤销/恢复信息）
            FOF_NOCONFIRMATION = 0x0010   # 静默不显示系统默认二次确认提示（由应用前端完成确认）
            FOF_SILENT = 0x0004           # 不显示系统进度框
            FOF_NOERRORUI = 0x0400        # 静默系统错误提示框

            norm_path = os.path.abspath(target_path).replace("/", "\\")
            if not os.path.exists(norm_path):
                return False

            # SHFILEOPSTRUCTW 要求 pFrom 必须以双空字符结束
            p_from = norm_path + "\0"

            fileop = SHFILEOPSTRUCTW()
            fileop.hwnd = 0
            fileop.wFunc = FO_DELETE
            fileop.pFrom = p_from
            fileop.pTo = None
            fileop.fFlags = FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT | FOF_NOERRORUI

            ret = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(fileop))
            if ret == 0 and not fileop.fAnyOperationsAborted and not os.path.exists(norm_path):
                return True
        except Exception as e:
            print("move_to_trash error:", e)
        return False

