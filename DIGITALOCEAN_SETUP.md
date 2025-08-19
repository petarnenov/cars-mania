# DigitalOcean Production Server Setup

This guide walks you through setting up a production server on DigitalOcean for Cars Mania.

## Prerequisites

- DigitalOcean account
- Domain name (optional but recommended)
- SSH key pair for secure access

## Step 1: Create DigitalOcean Droplet

### 1.1 Login to DigitalOcean
1. Go to [DigitalOcean](https://digitalocean.com)
2. Sign in to your account
3. Click "Create" → "Droplets"

### 1.2 Configure Droplet
- **Choose an image**: Ubuntu 22.04 LTS
- **Choose a plan**: Basic
- **Choose a datacenter region**: Select closest to your users
- **Authentication**: SSH Keys (recommended) or Password
- **Finalize and create**: Click "Create Droplet"

### 1.3 Recommended Droplet Specifications
- **Size**: Basic → Regular → 2GB RAM / 1 vCPU / 50GB SSD ($12/month)
- **Region**: Choose closest to your target users
- **Backup**: Enable for $2/month (recommended)

## Step 2: Initial Server Setup

### 2.1 Connect to Your Server
```bash
# Replace YOUR_SERVER_IP with your droplet's IP
ssh root@YOUR_SERVER_IP
```

### 2.2 Create Non-Root User
```bash
# Create new user
adduser cars-mania

# Add user to sudo group
usermod -aG sudo cars-mania

# Switch to new user
su - cars-mania
```

### 2.3 Set Up SSH Key Authentication
```bash
# Create .ssh directory
mkdir ~/.ssh
chmod 700 ~/.ssh

# Create authorized_keys file
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Add your public key (copy from your local machine)
nano ~/.ssh/authorized_keys
# Paste your public key here
```

### 2.4 Configure SSH Security
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config
```

Add/modify these lines:
```
PermitRootLogin no
PasswordAuthentication no
Port 22
```

```bash
# Restart SSH service (handle different service names)
if sudo systemctl list-unit-files | grep -q "sshd.service"; then
    sudo systemctl restart sshd
elif sudo systemctl list-unit-files | grep -q "ssh.service"; then
    sudo systemctl restart ssh
else
    echo "SSH service not found, please restart manually"
fi

# Test connection from new terminal (don't close current one!)
ssh cars-mania@206.189.169.189
```

## Step 3: Install Required Software

### 3.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
# SSH back in: ssh cars-mania@YOUR_SERVER_IP
```

### 3.3 Install Docker Compose
```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 3.4 Install Additional Tools
```bash
# Install useful tools
sudo apt install -y curl wget git nano htop ufw fail2ban
```

## Step 4: Configure Firewall

### 4.1 Set Up UFW Firewall
```bash
# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 4.2 Configure Fail2Ban
```bash
# Configure fail2ban for SSH protection
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Step 5: Set Up Project Directory

### 5.1 Create Project Structure
```bash
# Create project directory
sudo mkdir -p /opt/cars-mania
sudo chown $USER:$USER /opt/cars-mania
cd /opt/cars-mania

# Create necessary subdirectories
mkdir -p uploads prisma logs backups
```

### 5.2 Clone Project Files
```bash
# Download production files
wget https://raw.githubusercontent.com/petarnenov/cars-mania/main/docker-compose.prod.yml
wget https://raw.githubusercontent.com/petarnenov/cars-mania/main/production.env.example
wget https://raw.githubusercontent.com/petarnenov/cars-mania/main/scripts/deploy.sh

# Make deploy script executable
chmod +x deploy.sh
```

### 5.3 Configure Environment
```bash
# Copy environment template
cp production.env.example .env.production

# Edit environment file
nano .env.production
```

**Required environment variables:**
```bash
# Database
DATABASE_URL=file:/app/prisma/production.db

# JWT Secrets (generate strong random strings)
JWT_ACCESS_SECRET=your_very_long_random_access_secret_here
JWT_REFRESH_SECRET=your_very_long_random_refresh_secret_here

# Token TTL (in seconds)
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_SECONDS=1209600

# Backend Configuration
NODE_ENV=production
PORT=3001

# Frontend Configuration
BACKEND_URL=http://localhost:3001

# Docker Images (auto-filled by CI/CD)
BACKEND_IMAGE=ghcr.io/petarnenov/cars-mania/backend:latest
FRONTEND_IMAGE=ghcr.io/petarnenov/cars-mania/frontend:latest
```

## Step 6: Generate Secure Secrets

### 6.1 Generate JWT Secrets
```bash
# Generate secure random strings
openssl rand -base64 32
openssl rand -base64 32

# Use these outputs for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
```

### 6.2 Update Environment File
```bash
# Edit the .env.production file with your generated secrets
nano .env.production
```

## Step 7: Initial Deployment

### 7.1 Test Deployment
```bash
# Start services
./deploy.sh start

# Check status
./deploy.sh status

# View logs
./deploy.sh logs
```

### 7.2 Verify Services
```bash
# Check if services are running
docker ps

# Test backend health
curl http://localhost:3001/api/health

# Test frontend
curl http://localhost:80
```

## Step 8: Configure Domain (Optional)

### 8.1 Point Domain to Server
1. Go to your domain registrar
2. Add A record pointing to your server IP
3. Wait for DNS propagation (up to 24 hours)

### 8.2 Set Up SSL with Let's Encrypt
```bash
# Install Certbot
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Create nginx config for SSL
mkdir -p nginx
nano nginx/nginx.conf
```

**nginx.conf content:**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }

        location /api {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### 8.3 Update Docker Compose for SSL
```bash
# Edit docker-compose.prod.yml to include nginx
nano docker-compose.prod.yml
```

Add nginx service and update environment variables.

## Step 9: Set Up Monitoring

### 9.1 Create Monitoring Script
```bash
# Create monitoring script
nano monitor.sh
```

**monitor.sh content:**
```bash
#!/bin/bash

# Check if services are running
if ! docker ps | grep -q "cars-mania-backend"; then
    echo "Backend is down!"
    ./deploy.sh restart
fi

if ! docker ps | grep -q "cars-mania-frontend"; then
    echo "Frontend is down!"
    ./deploy.sh restart
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEM_USAGE -gt 80 ]; then
    echo "Memory usage is high: ${MEM_USAGE}%"
fi
```

```bash
chmod +x monitor.sh
```

### 9.2 Set Up Cron Job
```bash
# Edit crontab
crontab -e

# Add monitoring job (runs every 5 minutes)
*/5 * * * * /opt/cars-mania/monitor.sh >> /opt/cars-mania/logs/monitor.log 2>&1
```

## Step 10: Configure GitHub Secrets

### 10.1 Get Server Information
```bash
# Get server IP
curl ifconfig.me

# Get SSH key (if needed)
cat ~/.ssh/id_rsa.pub
```

### 10.2 Set GitHub Repository Secrets
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `PROD_HOST`: Your server IP or domain
- `PROD_USER`: cars-mania
- `PROD_SSH_KEY`: Your private SSH key
- `PROD_PORT`: 22

## Step 11: Test Production Deployment

### 11.1 Trigger Deployment
```bash
# Push a test commit to main branch
git commit --allow-empty -m "test: trigger production deployment"
git push origin main
```

### 11.2 Monitor Deployment
```bash
# Watch deployment logs
./deploy.sh logs

# Check service status
./deploy.sh status

# Test health endpoints
curl http://localhost:3001/api/health
curl http://localhost:80
```

## Step 12: Backup Strategy

### 12.1 Create Backup Script
```bash
# Create backup script
nano backup.sh
```

**backup.sh content:**
```bash
#!/bin/bash

BACKUP_DIR="/opt/cars-mania/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /opt/cars-mania/prisma/production.db $BACKUP_DIR/db_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/cars-mania/uploads/

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
chmod +x backup.sh
```

### 12.2 Schedule Daily Backups
```bash
# Edit crontab
crontab -e

# Add backup job (runs daily at 2 AM)
0 2 * * * /opt/cars-mania/backup.sh >> /opt/cars-mania/logs/backup.log 2>&1
```

## Troubleshooting

### Common Issues

1. **SSH service issues**
   ```bash
   # Check SSH service status
   sudo systemctl status sshd
   sudo systemctl status ssh
   
   # Check SSH service name
   sudo systemctl list-unit-files | grep ssh
   
   # Manual SSH restart
   sudo systemctl restart sshd  # or ssh
   ```

2. **Services won't start**
   ```bash
   # Check logs
   ./deploy.sh logs
   
   # Check environment
   cat .env.production
   ```

2. **Port conflicts**
   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :3001
   ```

3. **Docker issues**
   ```bash
   # Restart Docker
   sudo systemctl restart docker
   
   # Clean up Docker
   docker system prune -f
   ```

4. **SSL certificate issues**
   ```bash
   # Renew certificate
   sudo certbot renew
   ```

## Security Checklist

- [ ] SSH key authentication enabled
- [ ] Root login disabled
- [ ] Firewall configured (UFW)
- [ ] Fail2ban installed and configured
- [ ] Strong JWT secrets generated
- [ ] SSL certificate installed (if using domain)
- [ ] Regular backups scheduled
- [ ] Monitoring in place

## Next Steps

1. **Set up monitoring dashboard** (Grafana, Prometheus)
2. **Configure log aggregation** (ELK stack)
3. **Set up automated backups** to cloud storage
4. **Implement CI/CD pipeline** for automatic deployments
5. **Add performance monitoring** (New Relic, DataDog)

Your Cars Mania production server is now ready! 🚀
