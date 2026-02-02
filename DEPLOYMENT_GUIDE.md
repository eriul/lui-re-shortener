# lui.re URL Shortener - Complete Setup Guide

This guide will walk you through deploying your URL shortener to Azure and configuring your domain.

## 📋 What You Have

- **Domain**: lui.re
- **Frontend**: Clean, modern web interface
- **Backend**: Node.js/Express server with SQLite database
- **Features**: 
  - Random or custom short codes
  - Click tracking
  - Simple statistics API
  - Automatic redirects

## 🚀 Part 1: Azure Deployment

### Option A: Azure App Service (Recommended for beginners)

1. **Install Azure CLI** (if you haven't already)
   - Windows: Download from https://aka.ms/installazurecliwindows
   - Mac: `brew install azure-cli`
   - Linux: `curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash`

2. **Login to Azure**
   ```bash
   az login
   ```

3. **Create a Resource Group**
   ```bash
   az group create --name lui-re-resources --location westeurope
   ```

4. **Create an App Service Plan**
   ```bash
   az appservice plan create \
     --name lui-re-plan \
     --resource-group lui-re-resources \
     --sku B1 \
     --is-linux
   ```

5. **Create the Web App**
   ```bash
   az webapp create \
     --resource-group lui-re-resources \
     --plan lui-re-plan \
     --name lui-re-shortener \
     --runtime "NODE:18-lts"
   ```

6. **Deploy Your Code**
   
   First, initialize git in your project folder:
   ```bash
   cd url-shortener
   git init
   git add .
   git commit -m "Initial commit"
   ```

   Then deploy using Azure's local git:
   ```bash
   az webapp deployment source config-local-git \
     --name lui-re-shortener \
     --resource-group lui-re-resources
   ```

   Get the deployment URL:
   ```bash
   az webapp deployment list-publishing-credentials \
     --name lui-re-shortener \
     --resource-group lui-re-resources \
     --query scmUri \
     --output tsv
   ```

   Add Azure as a git remote and push:
   ```bash
   git remote add azure <URL-from-previous-command>
   git push azure main
   ```

7. **Configure the App**
   ```bash
   az webapp config appsettings set \
     --resource-group lui-re-resources \
     --name lui-re-shortener \
     --settings PORT=8080
   ```

### Option B: Azure Container Instances (Alternative)

If you prefer Docker:

1. **Create a Dockerfile** (I'll create this for you)
2. **Build and push to Azure Container Registry**
3. **Deploy to Azure Container Instances**

Let me know if you want the Docker approach instead!

## 🌐 Part 2: DNS Configuration

You need to point lui.re to your Azure app. Here's how:

### Get Your Azure App URL

```bash
az webapp show \
  --name lui-re-shortener \
  --resource-group lui-re-resources \
  --query defaultHostName \
  --output tsv
```

This will give you something like: `lui-re-shortener.azurewebsites.net`

### Configure DNS Records

Login to your domain registrar (where you bought lui.re) and add these DNS records:

#### For Root Domain (lui.re):
- **Type**: A Record or ALIAS (depending on your registrar)
- **Name**: @ (or leave blank)
- **Value**: IP address from Azure (see below)

To get the Azure app's IP:
```bash
nslookup lui-re-shortener.azurewebsites.net
```

Or use CNAME flattening if your registrar supports it.

#### For www subdomain (optional):
- **Type**: CNAME
- **Name**: www
- **Value**: lui-re-shortener.azurewebsites.net

#### Alternative: Use CNAME for root (if supported)
Some registrars (like Cloudflare) allow CNAME at root:
- **Type**: CNAME
- **Name**: @
- **Value**: lui-re-shortener.azurewebsites.net

### Add Custom Domain to Azure

```bash
az webapp config hostname add \
  --webapp-name lui-re-shortener \
  --resource-group lui-re-resources \
  --hostname lui.re
```

If you want www:
```bash
az webapp config hostname add \
  --webapp-name lui-re-shortener \
  --resource-group lui-re-resources \
  --hostname www.lui.re
```

## 🔒 Part 3: Enable HTTPS (SSL Certificate)

Azure provides free SSL certificates:

```bash
az webapp config ssl create \
  --resource-group lui-re-resources \
  --name lui-re-shortener \
  --hostname lui.re
```

Then bind it:
```bash
az webapp config ssl bind \
  --resource-group lui-re-resources \
  --name lui-re-shortener \
  --certificate-thumbprint <thumbprint-from-previous-command> \
  --ssl-type SNI
```

Or use the Azure Portal:
1. Go to your App Service
2. Click "Custom domains" in the left menu
3. Click "Add custom domain"
4. Follow the wizard to add SSL

## 🧪 Part 4: Testing

After DNS propagates (can take 5-60 minutes):

1. Visit https://lui.re - you should see the shortener interface
2. Create a short URL
3. Test that it redirects properly
4. Check stats at https://lui.re/api/stats/[your-code]

## 📊 Part 5: Database Persistence (IMPORTANT!)

SQLite stores data in a file (`urls.db`). On Azure App Service, this file can be lost during deployments or restarts. For production, you need persistent storage:

### Enable Persistent Storage on Azure

```bash
az webapp config appsettings set \
  --resource-group lui-re-resources \
  --name lui-re-shortener \
  --settings WEBSITES_ENABLE_APP_SERVICE_STORAGE=true
```

The database will be stored in `/home` which persists across restarts.

### Alternative: Use Azure SQL Database (More Robust)

For high-traffic production use, consider migrating to Azure SQL Database or PostgreSQL. Let me know if you need help with this!

## 🔧 Part 6: Monitoring and Maintenance

### View Logs
```bash
az webapp log tail \
  --name lui-re-shortener \
  --resource-group lui-re-resources
```

### Restart the App
```bash
az webapp restart \
  --name lui-re-shortener \
  --resource-group lui-re-resources
```

### View App in Azure Portal
```bash
az webapp browse \
  --name lui-re-shortener \
  --resource-group lui-re-resources
```

## 💰 Cost Estimates

- **B1 App Service Plan**: ~$13/month
- **Custom domain**: Free (you already own it)
- **SSL certificate**: Free (provided by Azure)
- **Data transfer**: Minimal for most use cases

## 🆘 Troubleshooting

### App won't start
- Check logs: `az webapp log tail --name lui-re-shortener --resource-group lui-re-resources`
- Ensure PORT is set correctly in app settings
- Verify package.json scripts are correct

### Domain not working
- Wait 10-60 minutes for DNS propagation
- Check DNS with: `nslookup lui.re`
- Verify custom domain is added in Azure Portal

### Short URLs not redirecting
- Check that the database is writable
- Verify the URL was created successfully
- Check server logs for errors

## 📝 Common DNS Registrar Instructions

### Cloudflare
1. Login to Cloudflare dashboard
2. Select lui.re domain
3. Go to DNS settings
4. Add CNAME record: @ → lui-re-shortener.azurewebsites.net
5. Set proxy status to "Proxied" for free SSL

### GoDaddy
1. Login to GoDaddy
2. My Products → DNS
3. Add record: CNAME @ points to lui-re-shortener.azurewebsites.net
4. Note: GoDaddy doesn't support CNAME at root well - use A record with IP instead

### Namecheap
1. Domain List → Manage
2. Advanced DNS
3. Add CNAME: @ → lui-re-shortener.azurewebsites.net

## 🎯 Next Steps

After basic deployment:
1. ✅ Test the shortener thoroughly
2. ✅ Set up monitoring/alerts in Azure
3. ✅ Consider backing up the database regularly
4. ✅ Add rate limiting to prevent abuse (optional)
5. ✅ Set up a custom 404 page (optional)

## 📞 Need Help?

If you run into issues:
1. Check the logs first
2. Verify DNS with online tools (whatsmydns.net)
3. Make sure all Azure commands completed successfully
4. Feel free to ask me for clarification on any step!
