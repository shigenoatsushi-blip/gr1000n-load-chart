#!/bin/bash
set -euo pipefail

# Only run in remote environments (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# This is a static HTML/JS/CSS project with no external dependencies to install.
# Node.js is used for JavaScript syntax validation.
echo "GR-1000N load chart: static project, no dependencies to install."
echo "Node.js version: $(node --version)"
