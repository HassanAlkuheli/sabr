#!/bin/bash
# ─────────────────────────────────────────────────
# Sabr VPS Setup Script
# Target: Ubuntu ARM64 (4 cores, 24 GB RAM)
# Run this ONCE on a fresh VPS as root:
#   curl -sL https://raw.githubusercontent.com/HassanAlkuheli/sabr/main/infra/setup-vps.sh | bash
# ─────────────────────────────────────────────────

set -euo pipefail

echo "════════════════════════════════════════"
echo "  Sabr VPS Setup – Ubuntu ARM64"
echo "════════════════════════════════════════"

# ── System updates ──
echo "📦 Updating system packages..."
apt-get update -y && apt-get upgrade -y

# ── Install Docker ──
if ! command -v docker &>/dev/null; then
  echo "🐳 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "✅ Docker already installed: $(docker --version)"
fi

# ── Install Docker Compose plugin (if not present) ──
if ! docker compose version &>/dev/null; then
  echo "🔧 Installing Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
else
  echo "✅ Docker Compose already installed: $(docker compose version)"
fi

# ── Install Git ──
if ! command -v git &>/dev/null; then
  echo "📋 Installing Git..."
  apt-get install -y git
else
  echo "✅ Git already installed: $(git --version)"
fi

# ── Install useful tools ──
apt-get install -y curl wget htop unzip jq

# ── Configure Docker logging (prevent disk fill) ──
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker

# ── Create app directory ──
mkdir -p /opt/sabr
echo "📂 App directory ready: /opt/sabr"

# ── Firewall (ufw) ──
echo "🔒 Configuring firewall..."
apt-get install -y ufw
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "✅ Firewall enabled: SSH(22), HTTP(80), HTTPS(443)"

# ── Swap (optional, for 24GB RAM probably not needed) ──
if [ ! -f /swapfile ]; then
  echo "💾 Creating 2GB swap..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo ""
echo "════════════════════════════════════════"
echo "  ✅ VPS Setup Complete!"
echo ""
echo "  Next steps:"
echo "  1. Add your GitHub Actions SSH key:"
echo "     echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys"
echo ""
echo "  2. Set these GitHub Secrets in your repo:"
echo "     VPS_HOST        = 81.208.174.6"
echo "     VPS_USER        = root"
echo "     VPS_SSH_KEY     = (your private SSH key)"
echo "     PRODUCTION_ENV  = (full .env contents)"
echo "     ADMIN_PASSWORD  = (strong admin password)"
echo "     SEED_PASSWORD   = (password for seeded accounts)"
echo ""
echo "  3. Push to main branch to trigger deployment!"
echo "════════════════════════════════════════"
