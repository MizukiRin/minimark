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
