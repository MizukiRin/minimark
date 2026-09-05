@echo off
title Build MiniMark Lite
cd /d "%~dp0"
echo ============================================
echo   Building MiniMark Lite (pywebview + Edge)
echo ============================================

"D:\miniconda3\envs\notes\python.exe" -m PyInstaller --clean --noconfirm --distpath "..\..\release" --workpath "..\..\build\MiniMark_Lite" MiniMark_Lite.spec

echo.
if exist "..\..\release\MiniMark_Lite\MiniMark_Lite.exe" (
    echo [SUCCESS] MiniMark Lite built successfully!
    echo Output directory: release\MiniMark_Lite
) else (
    echo [ERROR] Build failed. Check the logs above.
)
echo.
pause
