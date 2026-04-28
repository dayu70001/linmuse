# Lin Muse Deployment Guide

## 1. Upload the project to GitHub

From the `linmuse` project folder, run:

```bash
git status
git add .
git commit -m "Create Lin Muse website"
git push origin main
```

After this, refresh the GitHub repository page and confirm the website files appear.

## 2. Connect GitHub to Vercel

1. Open Vercel.
2. Choose **Add New Project**.
3. Choose **Import Git Repository**.
4. Select `dayu70001/linmuse`.
5. Keep these defaults:
   - Framework Preset: **Next.js**
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: leave empty
6. Click **Deploy**.

## 3. Add your domain in Vercel

1. Open your Vercel project.
2. Go to **Settings**.
3. Open **Domains**.
4. Add your domain, for example `linmuse.com`.
5. Also add `www.linmuse.com` if you want the www version.

## 4. DNS records to confirm before changing anything

Do not change DNS until you confirm these with your domain provider.

For the root domain, for example `linmuse.com`:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 76.76.21.21 |

For the www domain, for example `www.linmuse.com`:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | www | cname.vercel-dns.com |

If your domain provider uses `Host` instead of `Name`, use `@` for the root domain and `www` for the www domain.

## 5. Important placeholders to replace

The current website uses placeholder contact details:

- WhatsApp: `+86 138 0000 0000`
- Email: `hello@linmuse.com`

Replace these before publishing the final version.
