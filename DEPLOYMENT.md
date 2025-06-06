# Deployment Guide

This document provides step-by-step instructions for deploying the MCP Server to various platforms.

## Railway Deployment (Recommended)

Railway provides the easiest deployment experience for this MCP server.

### Step 1: Prepare Your Repository

1. Ensure all files are committed to Git
2. Push to GitHub if not already there

### Step 2: Deploy to Railway

1. Visit [railway.app](https://railway.app) and sign up/login
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose this repository
5. Railway will automatically:
   - Detect it's a Node.js project
   - Install dependencies with `npm install`
   - Build the project with `npm run build`
   - Start the server with `npm start`

### Step 3: Configure Environment (Optional)

Railway automatically provides:
- `PORT` environment variable
- Domain/URL for your deployment

No additional configuration needed!

### Step 4: Access Your MCP Server

After deployment, you'll get a URL like:


Your MCP endpoint will be:
```
https://your-url.railway.app/mcp
```

## Heroku Deployment

### Prerequisites
- Heroku CLI installed
- Heroku account

### Steps

1. Create a Heroku app:
```bash
heroku create your-app-name
```

2. Set buildpack (optional, auto-detected):
```bash
heroku buildpacks:set heroku/nodejs
```

3. Deploy:
```bash
git push heroku main
```

4. The app will be available at:
```
https://your-app-name.herokuapp.com/mcp
```

## Vercel Deployment

### Prerequisites
- Vercel CLI or GitHub integration

### Option 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Option 2: GitHub Integration

1. Visit [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-deploy

**Note**: Vercel works best with serverless functions. This Express server works but may have cold start delays.

## Docker Deployment

### Dockerfile

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Build and Run

```bash
docker build -t starbucks-mcp .
docker run -p 3000:3000 starbucks-mcp
```

## Environment Variables

The server supports these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port to listen on | `3000` |
| `NODE_ENV` | Environment mode | `production` |

## Health Checks

All platforms can use the built-in health check:

```
GET /health
```

Response:
```json
{
  "status": "healthy",
  "service": "starbucks-mcp-server",
  "version": "1.0.0",
  "timestamp": "2023-..."
}
```

## Monitoring

### Basic Monitoring

The server logs to stdout/stderr, which most platforms capture automatically.

### Advanced Monitoring

For production deployments, consider:

1. **Uptime monitoring**: Ping `/health` endpoint
2. **Error tracking**: Services like Sentry
3. **Performance monitoring**: New Relic, DataDog, etc.
4. **Log aggregation**: Logflare, Papertrail, etc.

## Scaling

### Railway
- Automatic scaling available in pro plans
- Handles traffic spikes automatically

### Heroku
- Use dynos for scaling:
```bash
heroku ps:scale web=2
```

### Other Platforms
- Most platforms offer horizontal scaling
- This server is stateless and scales well

## Troubleshooting

### Common Issues

1. **Port binding errors**: Ensure `PORT` environment variable is set
2. **Build failures**: Check Node.js version (requires 18+)
3. **Memory issues**: Most platforms provide 512MB+ which is sufficient

### Debugging

1. Check application logs
2. Test `/health` endpoint
3. Verify MCP endpoint with curl:
```bash
curl -X GET https://your-url/mcp \
  -H "Accept: text/event-stream"
```

### Getting Help

- Check platform-specific documentation
- Use platform support channels
- Open an issue in this repository

## Security

### HTTPS
All production deployments should use HTTPS. Most platforms provide this automatically.

### CORS
The server has CORS enabled by default for development. Consider restricting origins in production.

### Rate Limiting
Consider adding rate limiting for production deployments using middleware like `express-rate-limit`. 