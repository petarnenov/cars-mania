#!/bin/bash

# DigitalOcean Server Setup Script for Cars Mania
# Run this script on your DigitalOcean droplet as root

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run this script as root"
    exit 1
fi

log_info "Starting DigitalOcean server setup for Cars Mania..."

# Step 1: Update system
log_info "Updating system packages..."
apt update && apt upgrade -y
log_success "System updated"

# Step 2: Create non-root user
log_info "Creating non-root user..."
if ! id "cars-mania" &>/dev/null; then
    adduser --disabled-password --gecos "" cars-mania
    usermod -aG sudo cars-mania
    log_success "User 'cars-mania' created"
else
    log_warning "User 'cars-mania' already exists"
fi

# Step 3: Install required packages
log_info "Installing required packages..."
apt install -y curl wget git nano htop ufw fail2ban software-properties-common apt-transport-https ca-certificates gnupg lsb-release
log_success "Packages installed"

# Step 4: Install Docker
log_info "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker cars-mania
rm get-docker.sh
log_success "Docker installed"

# Step 5: Install Docker Compose
log_info "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
log_success "Docker Compose installed"

# Step 6: Configure firewall
log_info "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
log_success "Firewall configured"

# Step 7: Configure fail2ban
log_info "Configuring fail2ban..."
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
systemctl enable fail2ban
systemctl start fail2ban
log_success "Fail2ban configured"

# Step 8: Create project directory
log_info "Creating project directory..."
mkdir -p /opt/cars-mania
chown cars-mania:cars-mania /opt/cars-mania
log_success "Project directory created"

# Step 9: Set up SSH directory for cars-mania user
log_info "Setting up SSH for cars-mania user..."
sudo -u cars-mania mkdir -p /home/cars-mania/.ssh
sudo -u cars-mania chmod 700 /home/cars-mania/.ssh
sudo -u cars-mania touch /home/cars-mania/.ssh/authorized_keys
sudo -u cars-mania chmod 600 /home/cars-mania/.ssh/authorized_keys
log_success "SSH directory configured"

# Step 10: Configure SSH security
log_info "Configuring SSH security..."
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Restart SSH service (handle different service names)
if systemctl list-unit-files | grep -q "sshd.service"; then
    systemctl restart sshd
elif systemctl list-unit-files | grep -q "ssh.service"; then
    systemctl restart ssh
else
    log_warning "SSH service not found, please restart manually"
fi
log_success "SSH security configured"

# Step 11: Create setup completion script
log_info "Creating setup completion script..."
cat > /opt/cars-mania/complete-setup.sh << 'EOF'
#!/bin/bash

# Complete setup script - run as cars-mania user

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Completing Cars Mania setup..."

# Create subdirectories
mkdir -p uploads prisma logs backups

# Download production files
wget -O docker-compose.prod.yml https://raw.githubusercontent.com/petarnenov/cars-mania/main/docker-compose.prod.yml
wget -O production.env.example https://raw.githubusercontent.com/petarnenov/cars-mania/main/production.env.example
wget -O deploy.sh https://raw.githubusercontent.com/petarnenov/cars-mania/main/scripts/deploy.sh

# Make deploy script executable
chmod +x deploy.sh

# Copy environment template
cp production.env.example .env.production

echo -e "${GREEN}[SUCCESS]${NC} Setup files downloaded"
echo -e "${BLUE}[NEXT]${NC} Please edit .env.production with your configuration"
echo -e "${BLUE}[NEXT]${NC} Generate JWT secrets: openssl rand -base64 32"
echo -e "${BLUE}[NEXT]${NC} Run: ./deploy.sh start"
EOF

chmod +x /opt/cars-mania/complete-setup.sh
chown cars-mania:cars-mania /opt/cars-mania/complete-setup.sh
log_success "Setup completion script created"

# Step 12: Display next steps
log_success "DigitalOcean server setup completed!"
echo ""
echo "Next steps:"
echo "1. Add your SSH public key to /home/cars-mania/.ssh/authorized_keys"
echo "2. Switch to cars-mania user: su - cars-mania"
echo "3. Run: /opt/cars-mania/complete-setup.sh"
echo "4. Edit .env.production with your configuration"
echo "5. Generate JWT secrets: openssl rand -base64 32"
echo "6. Start services: ./deploy.sh start"
echo ""
echo "Security notes:"
echo "- Root login is disabled"
echo "- Password authentication is disabled"
echo "- Firewall is enabled (SSH, HTTP, HTTPS)"
echo "- Fail2ban is configured"
echo ""
echo "Server is ready for Cars Mania deployment! 🚀"
