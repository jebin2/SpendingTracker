#!/usr/bin/env bash
set -euo pipefail

APP_NAME="fundsflee"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-3000}"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

echo ""
echo "  FundsFlee — VPS deploy"
echo "  ─────────────────────────────────────────"
echo ""

# ── 1. Node.js ────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  warn "Node.js not found — installing via nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
else
  NODE_VER=$(node -v)
  info "Node.js $NODE_VER"
fi

# ── 2. PM2 ────────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  warn "PM2 not found — installing..."
  npm install -g pm2
fi
info "PM2 $(pm2 --version)"

# ── 3. .env.local ─────────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env.local" ]; then
  error ".env.local not found.\n\n  Copy .env.local.example and fill in your keys:\n\n    cp $APP_DIR/.env.local.example $APP_DIR/.env.local\n    nano $APP_DIR/.env.local\n\n  Then re-run this script."
fi
info ".env.local found"

# Quick sanity check — make sure NEXTAUTH_URL is not localhost if deploying remotely
NEXTAUTH_URL=$(grep -E '^NEXTAUTH_URL=' "$APP_DIR/.env.local" | cut -d= -f2- | tr -d '"' || true)
if [[ "$NEXTAUTH_URL" == *"localhost"* ]]; then
  warn "NEXTAUTH_URL is set to localhost: $NEXTAUTH_URL"
  warn "For a VPS deploy, update it to your server's public IP or domain, e.g.:"
  warn "  NEXTAUTH_URL=http://your-server-ip:$PORT"
fi

# ── 4. Install dependencies ───────────────────────────────────────────────────
echo ""
info "Installing dependencies..."
cd "$APP_DIR"
npm ci --prefer-offline 2>&1 | tail -3

# ── 5. Build ──────────────────────────────────────────────────────────────────
echo ""
info "Building..."
npm run build 2>&1 | tail -5

# ── 6. Start / restart with PM2 ───────────────────────────────────────────────
echo ""
if pm2 describe "$APP_NAME" &>/dev/null; then
  info "Restarting existing PM2 process '$APP_NAME'..."
  pm2 restart "$APP_NAME" --update-env
else
  info "Starting '$APP_NAME' on port $PORT..."
  pm2 start npm --name "$APP_NAME" -- start -- -p "$PORT"
fi

# ── 7. Persist + auto-start on reboot ────────────────────────────────────────
pm2 save
if pm2 startup 2>&1 | grep -q "sudo"; then
  echo ""
  warn "Run the following command to enable auto-start on reboot:"
  echo ""
  pm2 startup 2>&1 | grep "sudo"
  echo ""
else
  pm2 startup 2>&1 | bash || true
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "  ─────────────────────────────────────────"
info "Done!  App running at http://0.0.0.0:$PORT"
echo ""
echo "  Useful commands:"
echo "    pm2 logs $APP_NAME        — live logs"
echo "    pm2 status                — process status"
echo "    pm2 restart $APP_NAME     — restart"
echo "    pm2 stop $APP_NAME        — stop"
echo ""
echo "  To update: git pull && bash deploy.sh"
echo ""
