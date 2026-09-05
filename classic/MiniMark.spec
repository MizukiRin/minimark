# -*- mode: python ; coding: utf-8 -*-
import os

block_cipher = None

classic_dir = os.path.abspath(SPECPATH)
markdown_app_dir = os.path.dirname(classic_dir)

added_files = [
    (os.path.join(markdown_app_dir, 'ui'), 'ui'),
    (os.path.join(markdown_app_dir, 'assets'), 'assets'),
    (os.path.join(markdown_app_dir, 'core'), 'core'),
]

version_file = os.path.join(markdown_app_dir, 'version_info.txt')

a = Analysis(
    [os.path.join(classic_dir, 'main.py')],
    pathex=[classic_dir, markdown_app_dir],
    binaries=[],
    datas=added_files,
    hiddenimports=[
        'PySide6.QtWebEngineWidgets',
        'PySide6.QtWebEngineCore',
        'PySide6.QtWebChannel',
        'PySide6.QtCore',
        'PySide6.QtGui',
        'PySide6.QtWidgets',
        'backend',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'unittest', 'email', 'http', 'xmlrpc', 'matplotlib', 'numpy'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='MiniMark_Classic',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    version=version_file if os.path.exists(version_file) else None,
    icon=os.path.join(markdown_app_dir, 'assets', 'app.ico'),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='MiniMark_Classic',
)
