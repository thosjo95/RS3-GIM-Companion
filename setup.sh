#!/bin/bash
set -e

echo "================================================"
echo " RS3 GIM Companion — Server Setup"
echo "================================================"

# ── 1. System update ─────────────────────────────────────────────────────────
echo ""
echo ">>> Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Firewall ──────────────────────────────────────────────────────────────
echo ""
echo ">>> Configuring firewall..."
apt-get install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable
echo "Firewall configured."

# ── 3. Node.js 22 ────────────────────────────────────────────────────────────
echo ""
echo ">>> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null
apt-get install -y -qq nodejs
echo "Node.js $(node -v) installed."

# ── 4. PM2 + Nginx ───────────────────────────────────────────────────────────
echo ""
echo ">>> Installing PM2 and Nginx..."
npm install -g pm2 --silent
apt-get install -y -qq nginx
echo "PM2 $(pm2 -v) and Nginx installed."

# ── 5. Clone repo ────────────────────────────────────────────────────────────
echo ""
echo ">>> Cloning repository..."
mkdir -p /var/www
cd /var/www
rm -rf RS3-GIM-Companion
git clone https://github.com/thosjo95/RS3-GIM-Companion.git
cd RS3-GIM-Companion
echo "Repository cloned."

# ── 6. Install dependencies ──────────────────────────────────────────────────
echo ""
echo ">>> Installing server dependencies..."
cd /var/www/RS3-GIM-Companion/server
npm install --silent

echo ">>> Installing client dependencies and building..."
cd /var/www/RS3-GIM-Companion/client
npm install --silent
npm run build

# ── 7. PM2 ecosystem config ──────────────────────────────────────────────────
echo ""
echo ">>> Creating PM2 config..."
cat > /var/www/RS3-GIM-Companion/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'rs3-gim',
    script: 'server/index.js',
    cwd: '/var/www/RS3-GIM-Companion',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    restart_delay: 3000,
    max_restarts: 10,
    watch: false,
  }]
}
EOF

# ── 8. Start app with PM2 ────────────────────────────────────────────────────
echo ""
echo ">>> Starting app with PM2..."
cd /var/www/RS3-GIM-Companion
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash
echo "App started."

# ── 9. Nginx config ──────────────────────────────────────────────────────────
echo ""
echo ">>> Configuring Nginx..."
cat > /etc/nginx/sites-available/rs3-gim << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /var/www/RS3-GIM-Companion/client/dist;
    index index.html;

    # Serve React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API to Express
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/rs3-gim /etc/nginx/sites-enabled/rs3-gim
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# ── 10. Done ─────────────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo " Setup complete!"
echo " App is running at: http://178.104.126.158"
echo "================================================"
echo ""
pm2 status
