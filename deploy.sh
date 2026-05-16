#!/usr/bin/env bash
set -euo pipefail

APP_NAME="fundsflee"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-3000}"

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }
step()  { echo -e "\n${BLUE}──${NC} $*"; }

echo ""
echo "  FundsFlee — VPS deploy"
echo "  ─────────────────────────────────────────"

# ── 1. Node.js ────────────────────────────────────────────────────────────────
step "Node.js"
if ! command -v node &>/dev/null; then
  warn "Node.js not found — installing via nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck source=/dev/null
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
else
  info "Node.js $(node -v)"
fi

# ── 2. PM2 ────────────────────────────────────────────────────────────────────
step "PM2"
if ! command -v pm2 &>/dev/null; then
  warn "PM2 not found — installing..."
  npm install -g pm2
fi
info "PM2 $(pm2 --version)"

# ── 3. .env.local ─────────────────────────────────────────────────────────────
step ".env.local"
if [ ! -f "$APP_DIR/.env.local" ]; then
  error ".env.local not found.\n\n  Copy and fill in your keys:\n\n    cp $APP_DIR/.env.local.example $APP_DIR/.env.local\n    nano $APP_DIR/.env.local\n\n  Then re-run this script."
fi
info ".env.local found"

NEXTAUTH_URL=$(grep -E '^NEXTAUTH_URL=' "$APP_DIR/.env.local" | cut -d= -f2- | tr -d '"' || true)
if [[ "$NEXTAUTH_URL" == *"localhost"* ]]; then
  warn "NEXTAUTH_URL is still localhost — update it to your domain or VPS IP"
fi

# ── 4. Install dependencies ───────────────────────────────────────────────────
step "Dependencies"
cd "$APP_DIR"
npm ci --prefer-offline 2>&1 | tail -3
info "Dependencies installed"

# ── 5. Build ──────────────────────────────────────────────────────────────────
step "Build"
npm run build 2>&1 | tail -5
info "Build complete"

# ── 6. Start / restart with PM2 ───────────────────────────────────────────────
step "PM2 process"
if pm2 describe "$APP_NAME" &>/dev/null; then
  info "Restarting existing PM2 process '$APP_NAME'..."
  pm2 restart "$APP_NAME" --update-env
else
  info "Starting '$APP_NAME' on port $PORT..."
  pm2 start npm --name "$APP_NAME" -- start -- -p "$PORT"
fi

pm2 save

# PM2 startup — output the sudo command if needed
STARTUP_CMD=$(pm2 startup 2>&1 | grep "sudo" || true)
if [ -n "$STARTUP_CMD" ]; then
  warn "Run this once to enable auto-start on reboot:"
  echo ""
  echo "    $STARTUP_CMD"
  echo ""
fi

# ── 7. Nginx ──────────────────────────────────────────────────────────────────
step "Nginx"
DOMAIN=$(grep -E '^NEXTAUTH_URL=' "$APP_DIR/.env.local" | cut -d= -f2- | tr -d '"' | sed 's|https\?://||' | cut -d: -f1 || true)

if ! command -v nginx &>/dev/null; then
  warn "Nginx not found — installing..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y nginx
  elif command -v yum &>/dev/null; then
    sudo yum install -y nginx
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y nginx
  else
    warn "Could not auto-install nginx. Install it manually then re-run."
  fi
fi

if command -v nginx &>/dev/null; then
  NGINX_CONF="/etc/nginx/sites-available/$APP_NAME"
  NGINX_ENABLED="/etc/nginx/sites-enabled/$APP_NAME"

  sudo tee "$NGINX_CONF" > /dev/null <<NGINX
server {
    listen 80;
    server_name ${DOMAIN:-_};

    location / {
        proxy_pass         http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
NGINX

  # Enable site — symlink into sites-enabled (Debian/Ubuntu style).
  # Never touch other sites' configs (e.g. opencode.voidall.com).
  if [ -d /etc/nginx/sites-enabled ]; then
    sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
  fi

  sudo nginx -t && sudo systemctl reload nginx && sudo systemctl enable nginx
  info "Nginx configured → $DOMAIN → 127.0.0.1:$PORT"
  info "Existing sites (opencode etc.) are untouched"
fi

# ── 8. SSL with Certbot ───────────────────────────────────────────────────────
step "SSL (Let's Encrypt)"

# Only attempt SSL if domain is not an IP address
if [[ "$DOMAIN" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || [ -z "$DOMAIN" ]; then
  warn "Skipping SSL — NEXTAUTH_URL is an IP address or not set. SSL requires a real domain."
elif [[ "$NEXTAUTH_URL" == http://* ]]; then
  warn "NEXTAUTH_URL uses http:// — skipping SSL. Update to https:// once DNS is pointed at this server, then re-run."
else
  if ! command -v certbot &>/dev/null; then
    warn "Certbot not found — installing..."
    if command -v apt-get &>/dev/null; then
      sudo apt-get install -y certbot python3-certbot-nginx
    elif command -v yum &>/dev/null || command -v dnf &>/dev/null; then
      sudo yum install -y certbot python3-certbot-nginx 2>/dev/null || \
      sudo dnf install -y certbot python3-certbot-nginx
    fi
  fi

  if command -v certbot &>/dev/null; then
    EMAIL=$(grep -E '^#.*email|GOOGLE_CLIENT_ID' "$APP_DIR/.env.local" | head -1 || true)
    warn "Running Certbot for $DOMAIN — follow the prompts..."
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
      --email "admin@$DOMAIN" --redirect || \
    warn "Certbot failed — run manually: sudo certbot --nginx -d $DOMAIN"
    info "SSL configured"
  fi
fi

# ── 9. Oracle firewall ────────────────────────────────────────────────────────
step "Firewall"
# Oracle VPS blocks ports at OS level via iptables even if the Cloud Security List is open
if command -v iptables &>/dev/null; then
  sudo iptables -I INPUT -p tcp --dport 80 -j ACCEPT  2>/dev/null || true
  sudo iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
  # Persist rules across reboots
  if command -v netfilter-persistent &>/dev/null; then
    sudo netfilter-persistent save 2>/dev/null || true
  elif command -v iptables-save &>/dev/null; then
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null 2>/dev/null || true
  fi
  info "Ports 80 and 443 opened in iptables"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "  ─────────────────────────────────────────"
info "Done!"
echo ""
echo "  App:     http://127.0.0.1:$PORT  (internal)"
[ -n "${DOMAIN:-}" ] && echo "  Domain:  ${NEXTAUTH_URL:-http://$DOMAIN}"
echo ""
echo "  Useful commands:"
echo "    pm2 logs $APP_NAME          — live app logs"
echo "    pm2 status                  — process status"
echo "    pm2 restart $APP_NAME       — restart app"
echo "    sudo nginx -t               — test nginx config"
echo "    sudo certbot renew --dry-run — test SSL renewal"
echo ""
echo "  To update: git pull && bash deploy.sh"
echo ""
