# -*- coding: utf-8 -*-
"""
MiniMark Core - FileManager
负责统一的文件读写、智能多编码识别与保存逻辑。
"""

import os
import json


class FileManager:
    """通用文件管理服务"""

    SUPPORTED_ENCODINGS = ["utf-8", "utf-8-sig", "gbk", "gb2312", "latin-1"]

    @classmethod
    def read_file(cls, file_path: str) -> dict:
        """
        读取指定文件内容，智能尝试多种字符编码。
        返回字典: {"success": bool, "path": str, "name": str, "dir": str, "content": str, "error": str}
        """
        try:
            normalized_path = os.path.abspath(file_path)
            if not os.path.isfile(normalized_path):
                return {"success": False, "error": f"文件不存在: {normalized_path}"}

            content = None
            detected_encoding = None
            for enc in cls.SUPPORTED_ENCODINGS:
                try:
                    with open(normalized_path, "r", encoding=enc) as f:
                        content = f.read()
                    detected_encoding = enc
                    break
                except UnicodeDecodeError:
                    continue

            if content is None:
                return {"success": False, "error": "无法以支持的字符编码（UTF-8/GBK等）读取该文件"}

            name = os.path.basename(normalized_path)
            return {
                "success": True,
                "path": normalized_path.replace("\\", "/"),
                "name": name,
                "dir": os.path.dirname(normalized_path).replace("\\", "/"),
                "content": content,
                "encoding": detected_encoding
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    @classmethod
    def save_file(cls, file_path: str, content: str) -> dict:
        """
        保存内容到指定路径（以 UTF-8 编码），若目录不存在则自动创建。
        返回字典: {"success": bool, "path": str, "name": str, "dir": str, "error": str}
        """
        try:
            normalized_path = os.path.abspath(file_path)
            save_dir = os.path.dirname(normalized_path)
            os.makedirs(save_dir, exist_ok=True)
            with open(normalized_path, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "success": True,
                "path": normalized_path.replace("\\", "/"),
                "name": os.path.basename(normalized_path),
                "dir": save_dir.replace("\\", "/")
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
