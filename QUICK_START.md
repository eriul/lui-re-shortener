# Quick Start Guide for Non-Coders

This is a simplified guide to get your URL shortener running on Azure. If you get stuck, refer to the detailed DEPLOYMENT_GUIDE.md.

## What You Need

- Azure account (free tier works!)
- Access to your domain registrar for lui.re
- A computer with internet access

## Step-by-Step Setup

### Part 1: Prepare Your Computer (One-time setup)

#### Install Node.js
1. Go to https://nodejs.org
2. Download the LTS version (left button)
3. Run the installer, click "Next" through everything
4. Verify: Open terminal/command prompt and type: `node --version`

#### Install Azure CLI
1. Go to https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
2. Download for your operating system
3. Run the installer
4. Verify: Open terminal and type: `az --version`

#### Install Git
1. Go to https://git-scm.com/downloads
2. Download for your operating system
3. Run the installer
4. Verify: Open terminal and type: `git --version`

### Part 2: Test Locally (Optional but recommended)

1. **Download your URL shortener files** to a folder on your computer

2. **Open terminal/command prompt** in that folder
   - Windows: Shift + Right-click in folder → "Open PowerShell window here"
   - Mac: Right-click folder → Services → New Terminal at Folder

3. **Install dependencies**
   ```
   npm install
   ```

4. **Start the server**
   ```
   npm start
   ```

5. **Test it**: Open browser and go to http://localhost:3000

6. **Stop the server**: Press Ctrl+C in terminal

### Part 3: Deploy to Azure (The Main Event!)

#### 3.1: Login to Azure
```bash
az login
```
A browser will open - sign in with your Azure account.

#### 3.2: Create Resources
Copy and paste these commands one at a time:

```bash
az group create --name lui-re-resources --location westeurope
```

```bash
az appservice plan create --name lui-re-plan --resource-group lui-re-resources --sku B1 --is-linux
```

```bash
az webapp create --resource-group lui-re-resources --plan lui-re-plan --name lui-re-shortener --runtime "NODE:18-lts"
```

#### 3.3: Initialize Git
In your project folder:

```bash
git init
git add .
git commit -m "Initial commit"
```

#### 3.4: Deploy Your Code

Get the deployment URL:
```bash
az webapp deployment source config-local-git --name lui-re-shortener --resource-group lui-re-resources
```

Get credentials:
```bash
az webapp deployment list-publishing-credentials --name lui-re-shortener --resource-group lui-re-resources --query scmUri --output tsv
```

Copy the URL from the output. It looks like: `https://username:password@lui-re-shortener.scm.azurewebsites.net/lui-re-shortener.git`

Add it as a remote:
```bash
git remote add azure <paste-that-url-here>
```

Push your code:
```bash
git push azure main
```

Wait for deployment to complete (1-2 minutes).

#### 3.5: Configure the App
```bash
az webapp config appsettings set --resource-group lui-re-resources --name lui-re-shortener --settings PORT=8080 WEBSITES_ENABLE_APP_SERVICE_STORAGE=true
```

### Part 4: Configure Your Domain

#### 4.1: Get Your App's URL
```bash
az webapp show --name lui-re-shortener --resource-group lui-re-resources --query defaultHostName --output tsv
```

This gives you: `lui-re-shortener.azurewebsites.net`

#### 4.2: Update DNS Records

Login to where you bought your domain (GoDaddy, Namecheap, Cloudflare, etc.):

**Add this DNS record:**
- Type: CNAME
- Name: @ (or blank, or "lui.re" depending on your registrar)
- Value: `lui-re-shortener.azurewebsites.net`
- TTL: Automatic (or 3600)

Save it!

#### 4.3: Add Domain to Azure

Wait 5-10 minutes, then:

```bash
az webapp config hostname add --webapp-name lui-re-shortener --resource-group lui-re-resources --hostname lui.re
```

### Part 5: Enable HTTPS

In your web browser:
1. Go to https://portal.azure.com
2. Search for "lui-re-shortener"
3. Click on it
4. In left menu, click "TLS/SSL settings"
5. Click "Private Key Certificates (.pfx)"
6. Click "Create App Service Managed Certificate"
7. Select "lui.re" from dropdown
8. Click "Create"
9. Go back to "Custom domains"
10. Click "Add binding" next to lui.re
11. Select the certificate you just created
12. Click "Add"

### Part 6: Test Everything!

Wait 10-30 minutes for DNS to propagate, then:

1. Visit https://lui.re in your browser
2. You should see your URL shortener!
3. Try creating a short URL
4. Test that it redirects

## 🎉 You're Done!

Your URL shortener is now live at https://lui.re

## Costs

The B1 App Service Plan costs about $13/month. You can:
- Use the free tier (F1) but it sleeps after inactivity
- Upgrade to higher tiers for more traffic
- Downgrade or delete if you stop using it

To delete everything and stop charges:
```bash
az group delete --name lui-re-resources
```

## Common Issues

**"Domain not working yet"**
- DNS can take up to 48 hours to propagate
- Check status at: https://www.whatsmydns.net

**"App shows error page"**
- Check logs: `az webapp log tail --name lui-re-shortener --resource-group lui-re-resources`
- Restart: `az webapp restart --name lui-re-shortener --resource-group lui-re-resources`

**"Can't push to Git"**
- Make sure you copied the full URL with username:password
- Try getting credentials again

## Need More Help?

- Check the detailed DEPLOYMENT_GUIDE.md
- Azure documentation: https://docs.microsoft.com/azure
- Ask me for clarification on any step!
