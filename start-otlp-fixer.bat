@echo off
REM Start the Jaeger OTLP Trace Fixer proxy
echo Starting Jaeger OTLP Trace Fixer...

REM Set Jaeger host and port (modify if needed)
set JAEGER_HOST=localhost
set JAEGER_PORT=16686

REM Start the proxy server
node "%~dp0jaeger-otlp-fixer.js"