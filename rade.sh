#!/bin/bash
# RADE (Read, Analyze, Design, Execute) script for Headlamp project
# This script provides utilities for common development tasks

set -e

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/headlamp-55-Kallal" && pwd)"

# Function to display help
show_help() {
  echo -e "${BLUE}RADE - Headlamp Development Helper${NC}"
  echo
  echo "Usage: ./rade.sh [command]"
  echo
  echo "Commands:"
  echo "  read      - Read project status and configuration"
  echo "  analyze   - Analyze project dependencies and issues"
  echo "  design    - Generate or modify Kubernetes configurations"
  echo "  execute   - Execute common development tasks"
  echo "  help      - Show this help message"
  echo
  echo "Examples:"
  echo "  ./rade.sh read status    - Show project status"
  echo "  ./rade.sh analyze deps   - Check dependencies"
  echo "  ./rade.sh design config  - Generate K8s config"
  echo "  ./rade.sh execute dev    - Start development environment"
}

# READ functions
read_status() {
  echo -e "${GREEN}Reading project status...${NC}"
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Git Status:${NC}"
  git status -s
  
  echo -e "\n${YELLOW}Branch Information:${NC}"
  git branch -v
  
  echo -e "\n${YELLOW}Docker Images:${NC}"
  docker images | grep headlamp
}

read_config() {
  echo -e "${GREEN}Reading project configuration...${NC}"
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Kubernetes Configs:${NC}"
  cat kubernetes-headlamp.yaml
}

# ANALYZE functions
analyze_dependencies() {
  echo -e "${GREEN}Analyzing dependencies...${NC}"
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Frontend Dependencies:${NC}"
  cd frontend && npm list --depth=0
  
  echo -e "\n${YELLOW}Backend Dependencies:${NC}"
  cd "$PROJECT_ROOT/backend" && go list -m all
}

analyze_code() {
  echo -e "${GREEN}Analyzing code quality...${NC}"
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Frontend Linting:${NC}"
  cd frontend && npm run lint || echo -e "${RED}Linting issues found${NC}"
  
  echo -e "\n${YELLOW}Backend Go Vet:${NC}"
  cd "$PROJECT_ROOT/backend" && go vet ./...
}

# DESIGN functions
design_config() {
  echo -e "${GREEN}Generating Kubernetes configuration...${NC}"
  cd "$PROJECT_ROOT"
  
  # Create a custom configuration based on the template
  cat > custom-headlamp.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: headlamp
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: headlamp
  namespace: headlamp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: headlamp
  template:
    metadata:
      labels:
        app: headlamp
    spec:
      containers:
      - name: headlamp
        image: ghcr.io/headlamp-k8s/headlamp:latest
        ports:
        - containerPort: 4466
        env:
        - name: HEADLAMP_CONFIG
          value: /etc/headlamp/config.json
        volumeMounts:
        - name: config
          mountPath: /etc/headlamp
      volumes:
      - name: config
        configMap:
          name: headlamp-config
---
apiVersion: v1
kind: Service
metadata:
  name: headlamp
  namespace: headlamp
spec:
  ports:
  - port: 80
    targetPort: 4466
  selector:
    app: headlamp
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: headlamp-config
  namespace: headlamp
data:
  config.json: |
    {
      "oidc": {
        "clientID": "headlamp",
        "clientSecret": "headlamp-secret",
        "issuerURL": "https://your-oidc-provider.example.com"
      }
    }
EOF
  
  echo -e "${YELLOW}Generated custom-headlamp.yaml${NC}"
}

design_plugin() {
  echo -e "${GREEN}Creating plugin template...${NC}"
  cd "$PROJECT_ROOT"
  
  mkdir -p custom-plugin/src
  
  # Create plugin files
  cat > custom-plugin/package.json <<EOF
{
  "name": "@headlamp-plugin/custom-plugin",
  "version": "0.1.0",
  "description": "Custom plugin for Headlamp",
  "scripts": {
    "build": "headlamp-plugin build"
  },
  "dependencies": {
    "@emotion/react": "^11.7.1",
    "@emotion/styled": "^11.6.0",
    "@kubernetes-models/apimachinery": "^1.0.0",
    "@mui/icons-material": "^5.2.5",
    "@mui/lab": "^5.0.0-alpha.64",
    "@mui/material": "^5.2.8"
  },
  "peerDependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "react-router-dom": "^6.2.1"
  },
  "devDependencies": {
    "@headlamp-k8s/plugin-tools": "^0.5.0"
  }
}
EOF

  cat > custom-plugin/src/index.tsx <<EOF
import { registerPlugin } from '@headlamp-k8s/plugin-system';

const CustomPlugin = {
  name: 'custom-plugin',
  registry: {
    registerAppBarActions: [
      {
        component: () => {
          return (
            <div style={{ padding: '0 10px' }}>
              Custom Plugin
            </div>
          );
        },
      },
    ],
  },
};

registerPlugin(CustomPlugin);
EOF

  echo -e "${YELLOW}Created custom plugin template in custom-plugin directory${NC}"
}

# EXECUTE functions
execute_dev() {
  echo -e "${GREEN}Starting development environment...${NC}"
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Building and starting Headlamp...${NC}"
  make -C frontend start
}

execute_build() {
  echo -e "${GREEN}Building Headlamp...${NC}"
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Building Docker image...${NC}"
  docker build -t headlamp:local .
  
  echo -e "${YELLOW}Image built successfully:${NC}"
  docker images | grep headlamp
}

execute_test() {
  echo -e "${GREEN}Running tests...${NC}"
  cd "$PROJECT_ROOT"
  
  echo -e "${YELLOW}Frontend Tests:${NC}"
  cd frontend && npm test
  
  echo -e "\n${YELLOW}Backend Tests:${NC}"
  cd "$PROJECT_ROOT/backend" && go test ./...
}

# Main command handler
case "$1" in
  read)
    case "$2" in
      status) read_status ;;
      config) read_config ;;
      *) echo -e "${RED}Unknown read command: $2${NC}"; show_help ;;
    esac
    ;;
  analyze)
    case "$2" in
      deps) analyze_dependencies ;;
      code) analyze_code ;;
      *) echo -e "${RED}Unknown analyze command: $2${NC}"; show_help ;;
    esac
    ;;
  design)
    case "$2" in
      config) design_config ;;
      plugin) design_plugin ;;
      *) echo -e "${RED}Unknown design command: $2${NC}"; show_help ;;
    esac
    ;;
  execute)
    case "$2" in
      dev) execute_dev ;;
      build) execute_build ;;
      test) execute_test ;;
      *) echo -e "${RED}Unknown execute command: $2${NC}"; show_help ;;
    esac
    ;;
  help|"")
    show_help
    ;;
  *)
    echo -e "${RED}Unknown command: $1${NC}"
    show_help
    ;;
esac