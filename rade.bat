@echo off
REM RADE (Read, Analyze, Design, Execute) script for Headlamp project
REM This script provides utilities for common development tasks

setlocal enabledelayedexpansion

REM Colors for better output
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Project root directory
set "PROJECT_ROOT=%~dp0headlamp-55-Kallal"

REM Function to display help
:show_help
echo %BLUE%RADE - Headlamp Development Helper%NC%
echo.
echo Usage: rade.bat [command]
echo.
echo Commands:
echo   read      - Read project status and configuration
echo   analyze   - Analyze project dependencies and issues
echo   design    - Generate or modify Kubernetes configurations
echo   execute   - Execute common development tasks
echo   help      - Show this help message
echo.
echo Examples:
echo   rade.bat read status    - Show project status
echo   rade.bat analyze deps   - Check dependencies
echo   rade.bat design config  - Generate K8s config
echo   rade.bat execute dev    - Start development environment
goto :eof

REM READ functions
:read_status
echo %GREEN%Reading project status...%NC%
cd /d "%PROJECT_ROOT%"
  
echo %YELLOW%Git Status:%NC%
git status -s
  
echo.
echo %YELLOW%Branch Information:%NC%
git branch -v
  
echo.
echo %YELLOW%Docker Images:%NC%
docker images | findstr headlamp
goto :eof

:read_config
echo %GREEN%Reading project configuration...%NC%
cd /d "%PROJECT_ROOT%"
  
echo %YELLOW%Kubernetes Configs:%NC%
type kubernetes-headlamp.yaml
goto :eof

REM ANALYZE functions
:analyze_dependencies
echo %GREEN%Analyzing dependencies...%NC%
cd /d "%PROJECT_ROOT%"
  
echo %YELLOW%Frontend Dependencies:%NC%
cd frontend && npm list --depth=0
  
echo.
echo %YELLOW%Backend Dependencies:%NC%
cd /d "%PROJECT_ROOT%\backend" && go list -m all
goto :eof

:analyze_code
echo %GREEN%Analyzing code quality...%NC%
cd /d "%PROJECT_ROOT%"
  
echo %YELLOW%Frontend Linting:%NC%
cd frontend && npm run lint || echo %RED%Linting issues found%NC%
  
echo.
echo %YELLOW%Backend Go Vet:%NC%
cd /d "%PROJECT_ROOT%\backend" && go vet ./...
goto :eof

REM DESIGN functions
:design_config
echo %GREEN%Generating Kubernetes configuration...%NC%
cd /d "%PROJECT_ROOT%"
  
REM Create a custom configuration based on the template
(
echo apiVersion: v1
echo kind: Namespace
echo metadata:
echo   name: headlamp
echo ---
echo apiVersion: apps/v1
echo kind: Deployment
echo metadata:
echo   name: headlamp
echo   namespace: headlamp
echo spec:
echo   replicas: 1
echo   selector:
echo     matchLabels:
echo       app: headlamp
echo   template:
echo     metadata:
echo       labels:
echo         app: headlamp
echo     spec:
echo       containers:
echo       - name: headlamp
echo         image: ghcr.io/headlamp-k8s/headlamp:latest
echo         ports:
echo         - containerPort: 4466
echo         env:
echo         - name: HEADLAMP_CONFIG
echo           value: /etc/headlamp/config.json
echo         volumeMounts:
echo         - name: config
echo           mountPath: /etc/headlamp
echo       volumes:
echo       - name: config
echo         configMap:
echo           name: headlamp-config
echo ---
echo apiVersion: v1
echo kind: Service
echo metadata:
echo   name: headlamp
echo   namespace: headlamp
echo spec:
echo   ports:
echo   - port: 80
echo     targetPort: 4466
echo   selector:
echo     app: headlamp
echo ---
echo apiVersion: v1
echo kind: ConfigMap
echo metadata:
echo   name: headlamp-config
echo   namespace: headlamp
echo data:
echo   config.json: ^|
echo     {
echo       "oidc": {
echo         "clientID": "headlamp",
echo         "clientSecret": "headlamp-secret",
echo         "issuerURL": "https://your-oidc-provider.example.com"
echo       }
echo     }
) > custom-headlamp.yaml
  
echo %YELLOW%Generated custom-headlamp.yaml%NC%
goto :eof

:design_plugin
echo %GREEN%Creating plugin template...%NC%
cd /d "%PROJECT_ROOT%"
  
if not exist custom-plugin\src mkdir custom-plugin\src
  
REM Create plugin files
(
echo {
echo   "name": "@headlamp-plugin/custom-plugin",
echo   "version": "0.1.0",
echo   "description": "Custom plugin for Headlamp",
echo   "scripts": {
echo     "build": "headlamp-plugin build"
echo   },
echo   "dependencies": {
echo     "@emotion/react": "^11.7.1",
echo     "@emotion/styled": "^11.6.0",
echo     "@kubernetes-models/apimachinery": "^1.0.0",
echo     "@mui/icons-material": "^5.2.5",
echo     "@mui/lab": "^5.0.0-alpha.64",
echo     "@mui/material": "^5.2.8"
echo   },
echo   "peerDependencies": {
echo     "react": "^17.0.2",
echo     "react-dom": "^17.0.2",
echo     "react-router-dom": "^6.2.1"
echo   },
echo   "devDependencies": {
echo     "@headlamp-k8s/plugin-tools": "^0.5.0"
echo   }
echo }
) > custom-plugin\package.json

(
echo import { registerPlugin } from '@headlamp-k8s/plugin-system';
echo.
echo const CustomPlugin = {
echo   name: 'custom-plugin',
echo   registry: {
echo     registerAppBarActions: [
echo       {
echo         component: ^(^) ^=^> {
echo           return ^(
echo             ^<div style={{ padding: '0 10px' }}^>
echo               Custom Plugin
echo             ^</div^>
echo           ^);
echo         },
echo       },
echo     ],
echo   },
echo };
echo.
echo registerPlugin^(CustomPlugin^);
) > custom-plugin\src\index.tsx

echo %YELLOW%Created custom plugin template in custom-plugin directory%NC%
goto :eof

REM EXECUTE functions
:execute_dev
echo %GREEN%Starting development environment...%NC%
cd /d "%PROJECT_ROOT%"
  
echo %YELLOW%Building and starting Headlamp...%NC%
cd frontend && npm start
goto :eof

:execute_build
echo %GREEN%Building Headlamp...%NC%
cd /d "%PROJECT_ROOT%"
  
echo %YELLOW%Building Docker image...%NC%
docker build -t headlamp:local .
  
echo %YELLOW%Image built successfully:%NC%
docker images | findstr headlamp
goto :eof

:execute_test
echo %GREEN%Running tests...%NC%
cd /d "%PROJECT_ROOT%"
  
echo %YELLOW%Frontend Tests:%NC%
cd frontend && npm test
  
echo.
echo %YELLOW%Backend Tests:%NC%
cd /d "%PROJECT_ROOT%\backend" && go test ./...
goto :eof

REM Main command handler
if "%1"=="" goto show_help
if "%1"=="help" goto show_help

if "%1"=="read" (
  if "%2"=="status" (
    call :read_status
  ) else if "%2"=="config" (
    call :read_config
  ) else (
    echo %RED%Unknown read command: %2%NC%
    call :show_help
  )
) else if "%1"=="analyze" (
  if "%2"=="deps" (
    call :analyze_dependencies
  ) else if "%2"=="code" (
    call :analyze_code
  ) else (
    echo %RED%Unknown analyze command: %2%NC%
    call :show_help
  )
) else if "%1"=="design" (
  if "%2"=="config" (
    call :design_config
  ) else if "%2"=="plugin" (
    call :design_plugin
  ) else (
    echo %RED%Unknown design command: %2%NC%
    call :show_help
  )
) else if "%1"=="execute" (
  if "%2"=="dev" (
    call :execute_dev
  ) else if "%2"=="build" (
    call :execute_build
  ) else if "%2"=="test" (
    call :execute_test
  ) else (
    echo %RED%Unknown execute command: %2%NC%
    call :show_help
  )
) else (
  echo %RED%Unknown command: %1%NC%
  call :show_help
)