# 📋 Hackathon Customization Checklist

Use this checklist to make sure you customize everything for your company's MCP server!

## ✅ Required Changes

### 1. Project Information (`package.json`)
- [ ] Update `"name"` to your company name (lowercase, hyphens)
- [ ] Update `"description"` to describe your company's MCP server
- [ ] Update `"author"` to your company name
- [ ] Update keywords array to include your company name

### 2. Company Information (`src/index.ts`)
- [ ] Change `COMPANY_INFO.name` to your company name
- [ ] Write your company description in `COMPANY_INFO.description`
- [ ] Update `COMPANY_INFO.focus_areas` array with your services/expertise
- [ ] Update `COMPANY_INFO.stage` (startup, established, etc.)
- [ ] Update `COMPANY_INFO.approach` with your methodology
- [ ] Update `COMPANY_INFO.network` with your partnerships/network
- [ ] Update `COMPANY_INFO.website` with your website URL
- [ ] Update `COMPANY_INFO.contact` with your contact email

### 3. Server Configuration (`src/index.ts`)
- [ ] Change server name from `"project-nanda-server"` to your company

### 4. MCP Client Config (`examples/mcp-client-config.json`)
- [ ] Change `"your-company"` to your actual company name
- [ ] Update deployment URL after deploying

## ✅ Testing

- [ ] Run `npm install`
- [ ] Run `npm run build` (should succeed)
- [ ] Run `npm start` (server should start)
- [ ] Run `npm test` (should show YOUR company info)
- [ ] Test with MCP Inspector at `http://localhost:3000/mcp`

## ✅ Deployment

- [ ] Push code to GitHub
- [ ] Deploy to Railway or other platform
- [ ] Test deployed URL: `https://your-url.com/health`
- [ ] Test MCP endpoint: `https://your-url.com/mcp`
- [ ] Update Claude config with deployed URL

## ✅ AI Integration (Optional)

- [ ] Configure MCP client to connect to your server
- [ ] Test: Verify AI systems can access your company information
- [ ] Check that the MCP endpoint responds correctly

## 🎉 Done!

Your company now has an AI-accessible MCP server! 

**Bonus Points:**
- [ ] Add more information categories
- [ ] Add additional tools
- [ ] Customize the responses format
- [ ] Add your company branding to responses 