# Troubleshooting Guide

This guide covers common issues and their solutions for Cars Mania deployment.

## GitHub Actions Issues

### GHCR Push Permission Denied

**Error**: `denied: installation not allowed to Write organization package`

**Cause**: GitHub Actions doesn't have permission to push to GitHub Container Registry.

**Solutions**:

1. **Check Repository Settings**:
   - Go to your repository → Settings → Actions → General
   - Ensure "Workflow permissions" is set to "Read and write permissions"
   - Check "Allow GitHub Actions to create and approve pull requests"

2. **Verify Package Permissions**:
   - Go to Settings → Packages
   - Ensure the workflow has write access to packages

3. **Check Organization Settings** (if applicable):
   - Go to your organization → Settings → Actions → General
   - Ensure "Workflow permissions" allows package write access

4. **Use Personal Access Token** (if needed):

   ```yaml
   # In your workflow, replace GITHUB_TOKEN with a PAT
   - name: Log in to GHCR
     uses: docker/login-action@v3
     with:
       registry: ghcr.io
       username: ${{ github.actor }}
       password: ${{ secrets.PAT_TOKEN }}  # Use PAT instead of GITHUB_TOKEN
   ```

### Workflow Not Triggering

**Issue**: Deployment workflow doesn't run after CI passes.

**Solutions**:

1. **Check Workflow Permissions**:

   ```yaml
   permissions:
     contents: read
     packages: write
     actions: read
   ```

2. **Verify Trigger Configuration**:

   ```yaml
   on:
     workflow_run:
       workflows: ["CI"]
       types:
         - completed
       branches: [main]
   ```

3. **Check Branch Names**: Ensure your main branch is actually named `main`

## Docker Issues

### Image Build Failures

**Error**: `failed to solve: failed to compute cache key`

**Solutions**:

1. **Clear Docker Cache**:

   ```bash
   docker system prune -a
   ```

2. **Check Dockerfile Syntax**:

   ```bash
   docker build --no-cache .
   ```

3. **Verify Context Path**:

   ```yaml
   - name: Build and push backend
     uses: docker/build-push-action@v6
     with:
       context: ./backend  # Ensure this path is correct
   ```

### Container Won't Start

**Error**: `failed to start container`

**Solutions**:

1. **Check Logs**:

   ```bash
   docker logs container_name
   ```

2. **Verify Environment Variables**:

   ```bash
   docker exec container_name env
   ```

3. **Check Port Conflicts**:

   ```bash
   sudo netstat -tulpn | grep :3001
   ```

## Server Issues

### SSH Connection Problems

**Error**: `Permission denied (publickey)`

**Solutions**:

1. **Check SSH Key**:

   ```bash
   ssh-keygen -l -f ~/.ssh/id_rsa.pub
   ```

2. **Verify Authorized Keys**:

   ```bash
   cat ~/.ssh/authorized_keys
   ```

3. **Test SSH Connection**:

   ```bash
   ssh -v user@server_ip
   ```

### Service Won't Start

**Error**: `failed to start service`

**Solutions**:

1. **Check Service Status**:

   ```bash
   sudo systemctl status service_name
   ```

2. **View Service Logs**:

   ```bash
   sudo journalctl -u service_name -f
   ```

3. **Check Dependencies**:

   ```bash
   sudo systemctl list-dependencies service_name
   ```

## Environment Issues

### Missing Environment Variables

**Error**: `DATABASE_URL is not defined`

**Solutions**:

1. **Check Environment File**:

   ```bash
   cat .env.production
   ```

2. **Verify Variable Names**:

   ```bash
   grep -r "DATABASE_URL" .
   ```

3. **Test Environment Loading**:

   ```bash
   source .env.production && echo $DATABASE_URL
   ```

### JWT Secret Issues

**Error**: `JWT verification failed`

**Solutions**:

1. **Generate New Secrets**:

   ```bash
   openssl rand -base64 32
   ```

2. **Update Environment**:

   ```bash
   nano .env.production
   ```

3. **Restart Services**:

   ```bash
   ./deploy.sh restart
   ```

## Network Issues

### Port Already in Use

**Error**: `bind: address already in use`

**Solutions**:

1. **Find Process Using Port**:

   ```bash
   sudo lsof -i :3001
   ```

2. **Kill Process**:

   ```bash
   sudo kill -9 PID
   ```

3. **Change Port** (if needed):

   ```bash
   # In docker-compose.prod.yml
   ports:
     - "3002:3001"  # Use different host port
   ```

### Firewall Issues

**Error**: `Connection refused`

**Solutions**:

1. **Check Firewall Status**:

   ```bash
   sudo ufw status
   ```

2. **Allow Ports**:

   ```bash
   sudo ufw allow 3001
   sudo ufw allow 80
   ```

3. **Check Security Groups** (cloud providers):
   - Ensure ports are open in security group settings

## Database Issues

### Database Connection Failed

**Error**: `Unable to connect to database`

**Solutions**:

1. **Check Database URL**:

   ```bash
   echo $DATABASE_URL
   ```

2. **Test Database Connection**:

   ```bash
   npx prisma db push
   ```

3. **Check Database File Permissions**:

   ```bash
   ls -la prisma/
   ```

### Migration Issues

**Error**: `Migration failed`

**Solutions**:

1. **Reset Database** (development only):

   ```bash
   npx prisma migrate reset
   ```

2. **Check Migration Status**:

   ```bash
   npx prisma migrate status
   ```

3. **Apply Migrations**:

   ```bash
   npx prisma migrate deploy
   ```

## Performance Issues

### High Memory Usage

**Symptoms**: Server becomes slow or unresponsive

**Solutions**:

1. **Check Memory Usage**:

   ```bash
   free -h
   htop
   ```

2. **Optimize Docker**:

   ```bash
   docker system prune -f
   ```

3. **Add Swap** (if needed):

   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### High CPU Usage

**Symptoms**: Server becomes slow

**Solutions**:

1. **Check CPU Usage**:

   ```bash
   top
   htop
   ```

2. **Identify Resource-Intensive Processes**:

   ```bash
   ps aux --sort=-%cpu | head
   ```

3. **Optimize Application**:
   - Check for memory leaks
   - Optimize database queries
   - Add caching

## Monitoring and Debugging

### Enable Debug Logging

```bash
# Set debug environment variable
export DEBUG=*

# Or in docker-compose
environment:
  - DEBUG=*
```

### View Real-time Logs

```bash
# Docker logs
docker logs -f container_name

# System logs
sudo journalctl -f

# Application logs
tail -f logs/app.log
```

### Health Checks

```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost:80

# Database health
npx prisma db push
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs**: Use `./deploy.sh logs`
2. **Review this guide**: Look for similar error messages
3. **Check GitHub Issues**: Search for similar problems
4. **Create an issue**: Provide detailed error logs and steps to reproduce

## Common Commands

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
docker logs container  # Container logs

# Troubleshooting
sudo systemctl status service  # Service status
sudo journalctl -u service -f  # Service logs
sudo netstat -tulpn            # Port usage
sudo ufw status                # Firewall status
```
