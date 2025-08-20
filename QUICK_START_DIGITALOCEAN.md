# 🚀 Quick Start: DigitalOcean Production Server

Get your Cars Mania production server running on DigitalOcean in 15 minutes!

## Prerequisites

- DigitalOcean account
- SSH key pair (optional but recommended)
- Domain name (optional)

## Step 1: Create DigitalOcean Droplet

1. **Login to DigitalOcean**
   - Go to [digitalocean.com](https://digitalocean.com)
   - Click "Create" → "Droplets"

2. **Configure Droplet**
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic → Regular (2GB RAM / 1 vCPU / 50GB SSD) - $12/month
   - **Region**: Choose closest to your users
   - **Authentication**: SSH Keys (recommended)
   - **Finalize**: Click "Create Droplet"

3. **Wait for Creation**
   - Droplet will be ready in ~1 minute
   - Note your server IP address

## Step 2: Automated Server Setup

### Option A: Using Setup Script (Recommended)

1. **Connect to your server as root**

   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Download and run setup script**

   ```bash
   wget https://raw.githubusercontent.com/petarnenov/cars-mania/main/scripts/setup-digitalocean.sh
   chmod +x setup-digitalocean.sh
   ./setup-digitalocean.sh
   ```

3. **Add your SSH key**

   ```bash
   # Copy your public key to the server
   nano /home/cars-mania/.ssh/authorized_keys
   # Paste your public key here
   ```

4. **Complete setup as cars-mania user**

   ```bash
   su - cars-mania
   /opt/cars-mania/complete-setup.sh
   ```

### Option B: Manual Setup

Follow the detailed guide in `DIGITALOCEAN_SETUP.md`

## Step 3: Configure Environment

1. **Edit environment file**

   ```bash
   nano .env.production
   ```

2. **Generate JWT secrets**

   ```bash
   openssl rand -base64 32
   openssl rand -base64 32
   ```

3. **Update environment variables**

   ```bash
   # Replace these in .env.production:
   JWT_ACCESS_SECRET=your_generated_secret_1
   JWT_REFRESH_SECRET=your_generated_secret_2
   ```

## Step 4: Deploy Application

1. **Start services**

   ```bash
   ./deploy.sh start
   ```

2. **Check status**

   ```bash
   ./deploy.sh status
   ```

3. **View logs**

   ```bash
   ./deploy.sh logs
   ```

## Step 5: Test Your Application

1. **Test backend health**

   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Test frontend**

   ```bash
   curl http://localhost:80
   ```

3. **Access in browser**
   - Open: `http://YOUR_SERVER_IP`
   - Should see Cars Mania application

## Step 6: Configure GitHub Secrets (Optional)

For automatic deployments:

1. **Go to GitHub repository**
   - Settings → Secrets and variables → Actions

2. **Add secrets**
   - `PROD_HOST`: Your server IP
   - `PROD_USER`: cars-mania
   - `PROD_SSH_KEY`: Your private SSH key
   - `PROD_PORT`: 22

3. **Test deployment**

   ```bash
   # Push to main branch to trigger deployment
   git commit --allow-empty -m "test: trigger deployment"
   git push origin main
   ```

## Step 7: Domain & SSL (Optional)

1. **Point domain to server**
   - Add A record: `yourdomain.com` → `YOUR_SERVER_IP`

2. **Install SSL certificate**

   ```bash
   sudo apt install certbot
   sudo certbot certonly --standalone -d yourdomain.com
   ```

3. **Configure nginx for SSL**
   - Follow SSL setup in `DIGITALOCEAN_SETUP.md`

## Troubleshooting

### Common Issues

1. **Can't connect via SSH**

   ```bash
   # Check if SSH is running
   sudo systemctl status sshd
   
   # Check firewall
   sudo ufw status
   ```

2. **Services won't start**

   ```bash
   # Check logs
   ./deploy.sh logs
   
   # Check environment
   cat .env.production
   ```

3. **Port conflicts**

   ```bash
   # Check what's using ports
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :3001
   ```

### Useful Commands

```bash
# Service management
./deploy.sh start      # Start services
./deploy.sh stop       # Stop services
./deploy.sh restart    # Restart services
./deploy.sh update     # Update to latest images
./deploy.sh status     # Check service status
./deploy.sh logs       # View logs
./deploy.sh health     # Health check

# System monitoring
htop                   # System resources
df -h                  # Disk usage
free -h                # Memory usage
docker ps              # Running containers
```

## Security Checklist

- [x] SSH key authentication
- [x] Root login disabled
- [x] Firewall enabled (UFW)
- [x] Fail2ban configured
- [x] Strong JWT secrets
- [ ] SSL certificate (if using domain)
- [ ] Regular backups
- [ ] Monitoring setup

## Next Steps

1. **Set up monitoring** (Grafana, Prometheus)
2. **Configure backups** to cloud storage
3. **Add performance monitoring** (New Relic, DataDog)
4. **Set up log aggregation** (ELK stack)

## Support

- **Documentation**: `DIGITALOCEAN_SETUP.md`
- **Deployment Guide**: `PRODUCTION_DEPLOYMENT.md`
- **Troubleshooting**: Check logs with `./deploy.sh logs`

Your Cars Mania production server is now live! 🎉

**Access your application**: `http://YOUR_SERVER_IP`
