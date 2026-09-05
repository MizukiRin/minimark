# -*- mode: python ; coding: utf-8 -*-
import os

block_cipher = None

lite_dir = os.path.abspath(SPECPATH)
markdown_app_dir = os.path.dirname(lite_dir)

added_files = [
    (os.path.join(markdown_app_dir, 'ui'), 'ui'),
    (os.path.join(markdown_app_dir, 'assets'), 'assets'),
    (os.path.join(markdown_app_dir, 'core'), 'core'),
]

excluded_modules = [
    'PySide6',
    'shiboken6',
    'tkinter',
    'matplotlib',
    'numpy',
    'scipy',
    'pandas',
    'IPython',
    'unittest',
    'email',
    'xmlrpc',
    'pydoc'
]

a = Analysis(
    [os.path.join(lite_dir, 'main_lite.py')],
    pathex=[lite_dir, markdown_app_dir],
    binaries=[],
    datas=added_files,
    hiddenimports=['clr', 'pythonnet', 'webview', 'webview.platforms.winforms', 'webview.platforms.edgechromium'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=excluded_modules,
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
    name='MiniMark_Lite',
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
    name='MiniMark_Lite',
)
