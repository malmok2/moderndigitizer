@echo off
REM docs\index.html 굽기 — 템플릿에 Pretendard 글꼴과 버전을 박아 넣는다.
cd /d "%~dp0"
python tools\build_digitizer.py
