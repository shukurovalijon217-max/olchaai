#!/bin/bash
# OlchaAI — Self-hosted Coturn TURN Server Setup
# Ubuntu 24.04 LTS
# Usage: bash turn-setup.sh <DOMAIN> <SECRET>
# Example: bash turn-setup.sh turn.olchaai.com 973c2cb554e075eb1dfa...

set -e
DOMAIN="${1:-turn.olchaai.com}"
SECRET="${2:-CHANGE_THIS_SECRET}"
EMAIL="admin@olchaai.com"
PUBLIC_IP=$(curl -s ifconfig.me)

echo "================================================"
echo "  OlchaAI TURN Server Setup"
echo "  Domain : $DOMAIN"
echo "  IP     : $PUBLIC_IP"
echo "================================================"

# 1. System update
apt-get update -y && apt-get install -y coturn certbot ufw

# 2. Enable coturn daemon
sed -i 's/#TURNSERVER_ENABLED=1/TURNSERVER_ENABLED=1/' /etc/default/coturn || \
  echo "TURNSERVER_ENABLED=1" >> /etc/default/coturn

# 3. Open firewall ports
ufw allow 22/tcp    comment "SSH"
ufw allow 80/tcp    comment "HTTP (certbot)"
ufw allow 443/tcp   comment "HTTPS"
ufw allow 3478/tcp  comment "TURN TCP"
ufw allow 3478/udp  comment "TURN UDP"
ufw allow 5349/tcp  comment "TURNS TLS TCP"
ufw allow 5349/udp  comment "TURNS TLS UDP"
ufw allow 49152:65535/udp comment "TURN relay ports"
ufw --force enable

# 4. Get SSL certificate (port 80 must be free)
systemctl stop coturn 2>/dev/null || true
certbot certonly --standalone \
  -d "$DOMAIN" \
  --agree-tos --non-interactive \
  --email "$EMAIL" \
  --keep-until-expiring

# 5. Write turnserver.conf
cat > /etc/turnserver.conf << EOF
# OlchaAI Coturn Configuration
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=$PUBLIC_IP
external-ip=$PUBLIC_IP

realm=$DOMAIN
server-name=$DOMAIN

# HMAC-SHA1 time-limited credentials (matches /api/ice-config)
use-auth-secret
static-auth-secret=$SECRET

# TLS certificates
cert=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
pkey=/etc/letsencrypt/live/$DOMAIN/privkey.pem

# Relay port range
min-port=49152
max-port=65535

# Block RFC1918 private ranges (security)
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
denied-peer-ip=172.16.0.0-172.31.255.255

# Performance & logging
total-quota=1000
no-multicast-peers
log-file=/var/log/turnserver.log
EOF

# 6. Auto-renew SSL
echo "0 3 * * * root certbot renew --quiet && systemctl reload coturn" \
  > /etc/cron.d/certbot-coturn

# 7. Start coturn
systemctl enable coturn
systemctl restart coturn
sleep 2

# 8. Test
if systemctl is-active --quiet coturn; then
  STATUS="✅ ISHLAYAPTI"
else
  STATUS="❌ XATO — journalctl -u coturn ni tekshiring"
fi

echo ""
echo "================================================"
echo "  $STATUS"
echo "================================================"
echo ""
echo "  Render'ga qo'shing:"
echo "  COTURN_DOMAIN = $DOMAIN"
echo "  COTURN_SECRET = $SECRET"
echo ""
echo "  Test qilish:"
echo "  curl https://olchaai.com/api/ice-config"
echo "================================================"
