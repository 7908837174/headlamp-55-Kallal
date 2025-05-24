@echo off
REM OTLP Trace Sanitizer for Windows
REM This batch file is a wrapper for the fix-otlp-traces.js script

if "%1"=="" goto :usage
if "%2"=="" goto :usage

echo Running OTLP Trace Sanitizer...
node "%~dp0fix-otlp-traces.js" %1 %2
goto :eof

:usage
echo Usage: fix-otlp-traces.bat input.json output.json
echo.
echo This utility fixes OTLP trace files by converting negative values
echo in unsigned integer fields to zero, making them compatible with Jaeger.