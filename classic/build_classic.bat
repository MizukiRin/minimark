@echo off
title Build MiniMark Classic
cd /d "%~dp0"
echo ============================================
echo   Building MiniMark Classic (PySide6)
echo ============================================

"D:\miniconda3\envs\notes\python.exe" -m PyInstaller --clean --noconfirm --distpath "..\..\release" --workpath "..\..\build\MiniMark_Classic" MiniMark.spec

echo.
if exist "..\..\release\MiniMark_Classic\MiniMark_Classic.exe" (
    echo [SUCCESS] MiniMark Classic built successfully!
    echo Output directory: release\MiniMark_Classic
) else (
    echo [ERROR] Build failed. Check the logs above.
)
echo.
pause
