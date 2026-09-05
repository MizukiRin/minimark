# -*- coding: utf-8 -*-
"""
MiniMark Core - 核心共享业务模块
提供统一的文件 I/O、智能编码识别、工作区目录树解析与 Windows 系统集成能力。
"""

from .file_manager import FileManager
from .workspace_manager import WorkspaceManager
from .system_helper import SystemHelper

__all__ = ["FileManager", "WorkspaceManager", "SystemHelper"]
