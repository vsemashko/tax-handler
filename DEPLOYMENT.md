# Production Deployment Guide

This guide covers deploying the Polish B2B Tax Handler application to production.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured (for HTTPS)
- SSL certificates (Let's Encrypt recommended)
- Server with at least 4GB RAM, 2 CPU cores

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tax-handler
```

### 2. Configure Environment

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit production environment variables
nano .env.production
```

**Important:** Change these values:
- `DB_PASSWORD` - Strong PostgreSQL password
- `REDIS_PASSWORD` - Strong Redis password
- `JWT_SECRET` - Random string (at least 32 characters)
- `CORS_ORIGIN` - Your frontend domain

### 3. SSL Certificates

Place your SSL certificates in `nginx/ssl/`:

```bash
mkdir -p nginx/ssl
# Copy your certificates
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/
```

**Using Let's Encrypt:**

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
```

### 4. Update Nginx Configuration

Edit `nginx/nginx.conf` and replace `yourdomain.com` with your actual domain.

```bash
nano nginx/nginx.conf
# Replace: server_name yourdomain.com www.yourdomain.com;
```

### 5. Build and Start Services

```bash
# Build the application
docker-compose -f docker-compose.prod.yml build

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 6. Run Database Migrations

```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec app npm run migration:run
```

### 7. Verify Deployment

```bash
# Check application health
curl https://yourdomain.com/api/v1/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## Service Architecture

The production deployment includes:

- **App Container**: NestJS application (Node.js 18 Alpine)
- **PostgreSQL**: Database with performance tuning
- **Redis**: Cache with LRU eviction policy
- **Nginx**: Reverse proxy with SSL termination, rate limiting

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f app
docker-compose -f docker-compose.prod.yml logs -f postgres
docker-compose -f docker-compose.prod.yml logs -f redis
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Health Checks

```bash
# Application health
curl https://yourdomain.com/api/v1/health

# PostgreSQL health
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Redis health
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## Backup and Restore

### Database Backup

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U taxhandler taxhandler > backups/backup-$(date +%Y%m%d-%H%M%S).sql

# Or use automated backup script
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U taxhandler -Fc taxhandler > /backups/backup-$(date +%Y%m%d).dump
```

### Database Restore

```bash
# Restore from SQL backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U taxhandler taxhandler < backups/backup-20250101-120000.sql

# Restore from dump
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_restore -U taxhandler -d taxhandler /backups/backup-20250101.dump
```

## Scaling

### Horizontal Scaling

To run multiple app instances:

```bash
# Scale app service
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Nginx will load balance across instances
```

### Vertical Scaling

Edit `docker-compose.prod.yml` resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '4'        # Increase CPU
      memory: 4G       # Increase memory
```

## Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d app

# Run new migrations if any
docker-compose -f docker-compose.prod.yml exec app npm run migration:run
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart app
```

### Stop Services

```bash
# Stop all services
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose -f docker-compose.prod.yml down -v
```

## Security Checklist

- [ ] Changed default passwords in `.env.production`
- [ ] Configured SSL certificates
- [ ] Updated `CORS_ORIGIN` to your domain
- [ ] Enabled firewall (allow only 80, 443, 22)
- [ ] Set up automated backups
- [ ] Configured log rotation
- [ ] Updated Nginx server_name
- [ ] Reviewed rate limiting settings
- [ ] Disabled DB_SYNCHRONIZE in production
- [ ] Set LOG_LEVEL to 'info' or 'warn'

## Performance Tuning

### PostgreSQL

Already configured in `docker-compose.prod.yml`:
- Shared buffers: 256MB
- Effective cache size: 1GB
- Max connections: 200

### Redis

Already configured:
- Max memory: 512MB
- Eviction policy: LRU (Least Recently Used)
- Persistence: AOF (Append Only File)

### Application

Configure in `.env.production`:
- `REDIS_TTL=86400` (24 hours cache)
- `NBP_CACHE_TTL=86400` (24 hours exchange rate cache)

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check database connection
docker-compose -f docker-compose.prod.yml exec app \
  node -e "console.log(process.env.DB_HOST)"
```

### Database Connection Issues

```bash
# Verify database is running
docker-compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker-compose -f docker-compose.prod.yml logs postgres

# Test connection from app
docker-compose -f docker-compose.prod.yml exec app \
  nc -zv postgres 5432
```

### Redis Connection Issues

```bash
# Check Redis is running
docker-compose -f docker-compose.prod.yml ps redis

# Test connection
docker-compose -f docker-compose.prod.yml exec app \
  nc -zv redis 6379
```

### SSL Certificate Issues

```bash
# Verify certificates exist
ls -la nginx/ssl/

# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Renew Let's Encrypt certificates
sudo certbot renew
```

## Support

For issues and questions:
- Check logs: `docker-compose -f docker-compose.prod.yml logs -f`
- Review health endpoints: `/api/v1/health`
- Check API documentation: `https://yourdomain.com/api/docs`

## License

[Your License]
