import os
import sys

block_cipher = None

# 关键：Conda 环境下 Python C 依赖库位于 Library\bin，必须加入 PATH 并显式打包 DLL (如 libexpat.dll, ffi.dll 等)
conda_prefix = sys.prefix
conda_bin = os.path.join(conda_prefix, 'Library', 'bin')
if os.path.isdir(conda_bin):
    os.environ["PATH"] = conda_bin + os.pathsep + os.environ.get("PATH", "")

extra_binaries = []
if os.path.isdir(conda_bin):
    for f in os.listdir(conda_bin):
        fl = f.lower()
        if fl.endswith('.dll') and not fl.startswith('tcl') and not fl.startswith('tk'):
            extra_binaries.append((os.path.join(conda_bin, f), '.'))

added_files = [
    ('ui', 'ui'),
    ('assets', 'assets'),
]

a = Analysis(
    ['main.py'],
    pathex=['.', conda_bin],
    binaries=extra_binaries,
    datas=added_files,
    hiddenimports=[
        'PySide6.QtWebEngineWidgets',
        'PySide6.QtWebEngineCore',
        'PySide6.QtWebChannel',
        'PySide6.QtCore',
        'PySide6.QtGui',
        'PySide6.QtWidgets',
        'backend',
        'core',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'unittest', 'http', 'xmlrpc'],
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
    name='MiniMark',
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
    version='version_info.txt',
    icon='assets/app.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='MiniMark',
)
