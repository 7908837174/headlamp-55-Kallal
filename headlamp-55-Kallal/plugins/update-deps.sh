#!/bin/bash
# Enhanced update-deps.sh with checksum generation

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATE_CHECKSUM_SCRIPT="${SCRIPT_DIR}/../generate-checksum.js"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  exit 1
fi

# Check if the checksum generator script exists
if [ ! -f "${GENERATE_CHECKSUM_SCRIPT}" ]; then
  echo "Error: Checksum generator script not found: ${GENERATE_CHECKSUM_SCRIPT}"
  exit 1
fi

# Function to update dependencies and generate checksums
update_deps() {
  local plugin_dir="$1"
  local manifest_file="$2"
  
  if [ ! -d "${plugin_dir}" ]; then
    echo "Error: Plugin directory not found: ${plugin_dir}"
    return 1
  fi
  
  echo "Updating dependencies for ${plugin_dir}..."
  
  # Navigate to plugin directory
  pushd "${plugin_dir}" > /dev/null
  
  # Install dependencies
  npm install
  
  # Build the plugin
  npm run build
  
  # Get plugin info
  local name=$(node -e "console.log(require('./package.json').name)")
  local version=$(node -e "console.log(require('./package.json').version)")
  
  # Package the plugin
  npm pack
  
  # Get the package file name
  local package_file="${name}-${version}.tgz"
  if [ ! -f "${package_file}" ]; then
    echo "Error: Package file not found after npm pack: ${package_file}"
    popd > /dev/null
    return 1
  fi
  
  # Generate checksum and update manifest if specified
  if [ -n "${manifest_file}" ]; then
    echo "Generating checksum and updating manifest..."
    node "${GENERATE_CHECKSUM_SCRIPT}" \
      --update-manifest "${manifest_file}" \
      --plugin-name "${name}" \
      --plugin-version "${version}" \
      "${package_file}"
  else
    # Just generate and display the checksum
    echo "Generating checksum..."
    node "${GENERATE_CHECKSUM_SCRIPT}" "${package_file}"
  fi
  
  popd > /dev/null
}

# Main function
main() {
  local manifest_file=""
  
  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --manifest)
        manifest_file="$2"
        shift 2
        ;;
      *)
        break
        ;;
    esac
  done
  
  # Update each plugin directory
  for plugin_dir in "$@"; do
    update_deps "${plugin_dir}" "${manifest_file}"
  done
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 [--manifest MANIFEST_FILE] PLUGIN_DIR [PLUGIN_DIR...]"
  echo
  echo "Options:"
  echo "  --manifest MANIFEST_FILE  Update the specified manifest file with checksums"
  exit 1
fi

# Run the main function
main "$@"