# -*- coding: utf-8 -*-
"""
MiniMark Core - WorkspaceManager
负责工作区目录树解析、文件/文件夹的新建、重命名与删除。
"""

import os
import shutil


class WorkspaceManager:
    """通用工作区与目录树管理服务"""

    IGNORED_NAMES = {
        ".git", ".svn", ".hg", ".vscode", ".idea",
        "__pycache__", "node_modules", "target", "dist", "build", ".venv", "venv"
    }

    @classmethod
    def get_folder_tree(cls, folder_path: str, max_depth: int = 5) -> dict:
        """
        递归生成工作区文件夹的目录树 JSON 结构。
        """
        try:
            root_path = os.path.abspath(folder_path)
            if not os.path.isdir(root_path):
                return {"success": False, "error": "工作区目录不存在"}

            def scan_dir(dir_path: str, depth: int = 0):
                if depth > max_depth:
                    return []
                items = []
                try:
                    entries = sorted(os.scandir(dir_path), key=lambda e: (not e.is_dir(), e.name.lower()))
                    for entry in entries:
                        if entry.name.startswith(".") or entry.name in cls.IGNORED_NAMES:
                            continue

                        item = {
                            "name": entry.name,
                            "path": entry.path.replace("\\", "/"),
                            "isDir": entry.is_dir()
                        }
                        if entry.is_dir():
                            item["children"] = scan_dir(entry.path, depth + 1)
                        else:
                            ext = os.path.splitext(entry.name)[1].lower()
                            item["ext"] = ext
                        items.append(item)
                except PermissionError:
                    pass
                return items

            tree_data = {
                "name": os.path.basename(root_path) or root_path,
                "path": root_path.replace("\\", "/"),
                "isDir": True,
                "children": scan_dir(root_path)
            }
            return {"success": True, "data": tree_data}
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def create_file(cls, dir_path: str, filename: str) -> dict:
        """在指定目录下新建空文件"""
        try:
            target_path = os.path.abspath(os.path.join(dir_path, filename))
            if os.path.exists(target_path):
                return {"success": False, "error": "同名文件已存在"}
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, "w", encoding="utf-8") as f:
                f.write("")
            return {
                "success": True,
                "path": target_path.replace("\\", "/"),
                "name": filename,
                "dir": os.path.abspath(dir_path).replace("\\", "/")
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def create_folder(cls, dir_path: str, folder_name: str) -> dict:
        """在指定目录下新建子文件夹"""
        try:
            target_path = os.path.abspath(os.path.join(dir_path, folder_name))
            if os.path.exists(target_path):
                return {"success": False, "error": "同名文件夹已存在"}
            os.makedirs(target_path, exist_ok=True)
            return {
                "success": True,
                "path": target_path.replace("\\", "/"),
                "name": folder_name,
                "dir": os.path.abspath(dir_path).replace("\\", "/")
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def rename_path(cls, old_path: str, new_name: str) -> dict:
        """重命名文件或文件夹"""
        try:
            old_path = os.path.abspath(old_path)
            if not os.path.exists(old_path):
                return {"success": False, "error": "目标路径不存在"}
            parent_dir = os.path.dirname(old_path)
            new_path = os.path.join(parent_dir, new_name)
            os.rename(old_path, new_path)
            return {
                "success": True,
                "oldPath": old_path.replace("\\", "/"),
                "newPath": new_path.replace("\\", "/"),
                "name": new_name
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def delete_path(cls, target_path: str) -> dict:
        """删除指定文件或文件夹（优先移入 Windows 回收站，以便可还原查看）"""
        try:
            target_path = os.path.abspath(target_path)
            if not os.path.exists(target_path):
                return {"success": False, "error": "目标路径不存在"}

            # 1. 优先调用 Windows 原生 API 将文件/文件夹移入回收站
            from core.system_helper import SystemHelper
            if SystemHelper.move_to_trash(target_path):
                return {
                    "success": True,
                    "path": target_path.replace("\\", "/"),
                    "inRecycleBin": True
                }

            # 2. 若系统移入回收站未支持（例如网络映射驱动器），降级执行物理删除
            if os.path.isdir(target_path):
                shutil.rmtree(target_path)
            else:
                os.remove(target_path)
            return {
                "success": True,
                "path": target_path.replace("\\", "/"),
                "inRecycleBin": False
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
