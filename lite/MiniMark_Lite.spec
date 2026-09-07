import os
import sys

block_cipher = None

lite_dir = os.path.abspath(SPECPATH)
markdown_app_dir = os.path.dirname(lite_dir)

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
    'xmlrpc',
    'pydoc'
]

a = Analysis(
    [os.path.join(lite_dir, 'main_lite.py')],
    pathex=[lite_dir, markdown_app_dir, conda_bin],
    binaries=extra_binaries,
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
    version=os.path.join(lite_dir, 'version_info_lite.txt'),
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
