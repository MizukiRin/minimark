# -*- coding: utf-8 -*-
"""
MiniMark Core - AppRegistrar
负责 Windows 应用程序注册、打开方式关联、路径自愈及卸载注销清理。
基于 HKEY_CURRENT_USER (HKCU)，零 UAC 提权干扰。
"""

import os
import sys
import ctypes
import winreg
from typing import Dict, Any, Tuple, Optional


class AppRegistrar:
    """Windows 应用程序注册与关联管理器"""

    SUPPORTED_EXTENSIONS = [".md", ".markdown", ".mdown", ".mkd", ".txt"]
    VERSION = "2.2.0"
    PUBLISHER = "MizukiRin"

    @classmethod
    def get_app_info(cls, is_lite: bool = False) -> Dict[str, str]:
        """获取应用基础元数据与物理执行文件路径"""
        if is_lite or "lite" in os.path.basename(sys.argv[0]).lower() or "lite" in os.path.basename(sys.executable).lower():
            app_name = "MiniMark Lite"
            app_id = "MiniMark_Lite"
            exe_name = "MiniMark_Lite.exe"
        else:
            app_name = "MiniMark"
            app_id = "MiniMark"
            exe_name = "MiniMark.exe"

        # 判断是否为 PyInstaller 打包环境
        if getattr(sys, "frozen", False):
            exe_path = os.path.abspath(sys.executable)
        else:
            # 开发调试模式：如果 release 目录下已构建对应 exe 则优先使用该 exe，否则回退为当前脚本入口
            root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            target_sub = "MiniMark_Lite" if (is_lite or "lite" in exe_name.lower()) else "MiniMark"
            release_exe = os.path.join(os.path.dirname(root_dir), "release", target_sub, exe_name)
            if os.path.exists(release_exe):
                exe_path = os.path.abspath(release_exe)
            else:
                exe_path = os.path.abspath(sys.executable)

        exe_dir = os.path.dirname(exe_path)
        return {
            "app_name": app_name,
            "app_id": app_id,
            "exe_name": exe_name,
            "exe_path": exe_path,
            "exe_dir": exe_dir
        }

    @classmethod
    def notify_shell_change(cls):
        """通知 Windows 资源管理器刷新文件关联与打开方式缓存 (SHChangeNotify)"""
        try:
            # SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0
            ctypes.windll.shell32.SHChangeNotify(0x08000000, 0, None, None)
        except Exception:
            pass

    @classmethod
    def get_registered_exe_path(cls, is_lite: bool = False) -> Optional[str]:
        """获取注册表中登记的当前执行文件路径"""
        info = cls.get_app_info(is_lite)
        cmd_key_path = rf"Software\Classes\Applications\{info['exe_name']}\shell\open\command"
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, cmd_key_path, 0, winreg.KEY_READ) as key:
                val, _ = winreg.QueryValueEx(key, "")
                if val:
                    # 去除可能的参数与引号
                    parts = val.split('"')
                    if len(parts) >= 2:
                        return parts[1]
                    return val.split()[0]
        except Exception:
            pass
        return None

    @classmethod
    def is_registered(cls, is_lite: bool = False) -> bool:
        """检测应用是否已在 Windows 注册表中完成登记"""
        reg_path = cls.get_registered_exe_path(is_lite)
        return bool(reg_path)

    @classmethod
    def check_and_heal(cls, is_lite: bool = False) -> Dict[str, Any]:
        """
        启动时自愈与首次检查：
        1. 若未注册，自动执行注册并标记 was_registered_now = True；
        2. 若已注册但物理路径变更（用户移动了 exe 文件夹），自动更新路径并标记 was_self_healed = True；
        3. 若路径一致，保持就绪。
        """
        info = cls.get_app_info(is_lite)
        current_exe = info["exe_path"]
        registered_exe = cls.get_registered_exe_path(is_lite)

        res = {
            "is_registered": False,
            "was_registered_now": False,
            "was_self_healed": False,
            "current_exe": current_exe,
            "registered_exe": registered_exe,
            "app_name": info["app_name"]
        }

        if not registered_exe:
            # 首次运行：自动注册
            success, _ = cls.register(is_lite=is_lite, notify_explorer=True)
            res["is_registered"] = success
            res["was_registered_now"] = success
            res["registered_exe"] = current_exe
            return res

        # 已注册，比对路径
        if os.path.normcase(os.path.abspath(registered_exe)) != os.path.normcase(os.path.abspath(current_exe)):
            # 移动位置自愈：重新注册覆盖新路径
            success, _ = cls.register(is_lite=is_lite, notify_explorer=True)
            res["is_registered"] = success
            res["was_self_healed"] = success
            res["registered_exe"] = current_exe
            return res

        res["is_registered"] = True
        return res

    @classmethod
    def register(cls, is_lite: bool = False, notify_explorer: bool = True) -> Tuple[bool, str]:
        """
        注册为 Windows 应用程序并配置打开方式。
        写入路径全部位于 HKEY_CURRENT_USER，免管理员提权。
        """
        info = cls.get_app_info(is_lite)
        exe_path = info["exe_path"]
        exe_dir = info["exe_dir"]
        exe_name = info["exe_name"]
        app_name = info["app_name"]
        app_id = info["app_id"]
        open_cmd = f'"{exe_path}" "%1"'
        icon_val = f'"{exe_path}",0'

        try:
            # 1. 注册 Applications\<exe_name> (Windows 官方打开方式候选池)
            app_key_path = rf"Software\Classes\Applications\{exe_name}"
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, app_key_path) as k:
                winreg.SetValueEx(k, "FriendlyAppName", 0, winreg.REG_SZ, app_name)
                winreg.SetValueEx(k, "ApplicationCompany", 0, winreg.REG_SZ, cls.PUBLISHER)

            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"{app_key_path}\DefaultIcon") as k:
                winreg.SetValueEx(k, "", 0, winreg.REG_SZ, icon_val)

            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"{app_key_path}\SupportedTypes") as k:
                for ext in cls.SUPPORTED_EXTENSIONS:
                    winreg.SetValueEx(k, ext, 0, winreg.REG_SZ, "")

            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"{app_key_path}\shell\open\command") as k:
                winreg.SetValueEx(k, "", 0, winreg.REG_SZ, open_cmd)

            # 2. 注册 Document ProgID 关联
            doc_key_path = rf"Software\Classes\{app_id}.Document"
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, doc_key_path) as k:
                winreg.SetValueEx(k, "", 0, winreg.REG_SZ, f"{app_name} Document")

            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"{doc_key_path}\DefaultIcon") as k:
                winreg.SetValueEx(k, "", 0, winreg.REG_SZ, icon_val)

            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"{doc_key_path}\shell\open\command") as k:
                winreg.SetValueEx(k, "", 0, winreg.REG_SZ, open_cmd)

            # 3. 关联扩展名的 OpenWithList 与 OpenWithProgids
            for ext in cls.SUPPORTED_EXTENSIONS:
                try:
                    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"Software\Classes\{ext}\OpenWithList\{exe_name}"):
                        pass
                    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, rf"Software\Classes\{ext}\OpenWithProgids") as k:
                        winreg.SetValueEx(k, f"{app_id}.Document", 0, winreg.REG_NONE, b"")
                except Exception:
                    pass

            # 4. 注册 App Paths (支持 Win+R 运行窗口直接输入应用名启动)
            app_paths_key = rf"Software\Microsoft\Windows\CurrentVersion\App Paths\{exe_name}"
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, app_paths_key) as k:
                winreg.SetValueEx(k, "", 0, winreg.REG_SZ, exe_path)
                winreg.SetValueEx(k, "Path", 0, winreg.REG_SZ, exe_dir)

            # 5. 注册 Windows 已安装应用与卸载入口 (控制面板 / 设置 -> 安装的应用)
            uninstall_key = rf"Software\Microsoft\Windows\CurrentVersion\Uninstall\{app_id}"
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, uninstall_key) as k:
                winreg.SetValueEx(k, "DisplayName", 0, winreg.REG_SZ, app_name)
                winreg.SetValueEx(k, "DisplayVersion", 0, winreg.REG_SZ, cls.VERSION)
                winreg.SetValueEx(k, "Publisher", 0, winreg.REG_SZ, cls.PUBLISHER)
                winreg.SetValueEx(k, "DisplayIcon", 0, winreg.REG_SZ, icon_val)
                winreg.SetValueEx(k, "InstallLocation", 0, winreg.REG_SZ, exe_dir)
                winreg.SetValueEx(k, "UninstallString", 0, winreg.REG_SZ, f'"{exe_path}" --uninstall')
                winreg.SetValueEx(k, "NoModify", 0, winreg.REG_DWORD, 1)
                winreg.SetValueEx(k, "NoRepair", 0, winreg.REG_DWORD, 1)

            if notify_explorer:
                cls.notify_shell_change()

            return True, f"已成功注册为 Windows 应用程序并关联打开方式 ({exe_path})"
        except Exception as e:
            return False, f"注册失败: {str(e)}"

    @classmethod
    def _delete_key_tree(cls, root_key, subkey_path):
        """递归删除注册表子树"""
        try:
            with winreg.OpenKey(root_key, subkey_path, 0, winreg.KEY_ALL_ACCESS) as key:
                while True:
                    try:
                        child = winreg.EnumKey(key, 0)
                        cls._delete_key_tree(key, child)
                    except OSError:
                        break
            winreg.DeleteKey(root_key, subkey_path)
        except Exception:
            pass

    @classmethod
    def unregister(cls, is_lite: bool = False, notify_explorer: bool = True) -> Tuple[bool, str]:
        """
        从 Windows 注册表中彻底注销并清除所有关联与卸载项。
        """
        info = cls.get_app_info(is_lite)
        exe_name = info["exe_name"]
        app_id = info["app_id"]

        try:
            # 1. 移除 Applications\<exe_name>
            cls._delete_key_tree(winreg.HKEY_CURRENT_USER, rf"Software\Classes\Applications\{exe_name}")

            # 2. 移除 ProgID Document
            cls._delete_key_tree(winreg.HKEY_CURRENT_USER, rf"Software\Classes\{app_id}.Document")

            # 3. 移除各扩展名下的 OpenWithList 与 OpenWithProgids
            for ext in cls.SUPPORTED_EXTENSIONS:
                try:
                    cls._delete_key_tree(winreg.HKEY_CURRENT_USER, rf"Software\Classes\{ext}\OpenWithList\{exe_name}")
                except Exception:
                    pass
                try:
                    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, rf"Software\Classes\{ext}\OpenWithProgids", 0, winreg.KEY_ALL_ACCESS) as k:
                        winreg.DeleteValue(k, f"{app_id}.Document")
                except Exception:
                    pass

            # 4. 移除 App Paths
            cls._delete_key_tree(winreg.HKEY_CURRENT_USER, rf"Software\Microsoft\Windows\CurrentVersion\App Paths\{exe_name}")

            # 5. 移除 Uninstall 卸载项
            cls._delete_key_tree(winreg.HKEY_CURRENT_USER, rf"Software\Microsoft\Windows\CurrentVersion\Uninstall\{app_id}")

            if notify_explorer:
                cls.notify_shell_change()

            return True, f"{info['app_name']} 已成功从 Windows 注册表中注销并清理所有关联项"
        except Exception as e:
            return False, f"注销失败: {str(e)}"

    @classmethod
    def get_status_report(cls, is_lite: bool = False) -> Dict[str, Any]:
        """获取当前系统注册与自愈状态信息字典"""
        info = cls.get_app_info(is_lite)
        current_exe = info["exe_path"]
        registered_exe = cls.get_registered_exe_path(is_lite)
        is_reg = bool(registered_exe)
        is_aligned = is_reg and (os.path.normcase(os.path.abspath(registered_exe)) == os.path.normcase(os.path.abspath(current_exe)))

        return {
            "app_name": info["app_name"],
            "app_id": info["app_id"],
            "exe_name": info["exe_name"],
            "version": cls.VERSION,
            "is_registered": is_reg,
            "is_aligned": is_aligned,
            "is_path_matching": is_aligned,
            "current_exe": current_exe,
            "registered_exe": registered_exe or "",
            "registered_path": registered_exe or "",
            "supported_extensions": cls.SUPPORTED_EXTENSIONS
        }
