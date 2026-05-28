# 📄 Deploy to GitHub Pages - Step by Step

Your **free**, **GitHub-hosted** web app. No extra accounts needed!

---

## 📋 Prerequisites

- GitHub account (free)
- Your code committed locally (or ready to commit)

---

## 🚀 Step-by-Step Deployment

### Step 1: Build for Web Locally

```bash
cd rainbow_web
pygbag main.py
cd ..
```

⏱️ *Takes 5-10 minutes the first time (compiles Pygame to WebAssembly)*

### Step 2: Create GitHub Repository

If you haven't already:

```bash
git init
git add .
git commit -m "RainbowSim web app"
git remote add origin https://github.com/yourusername/RainbowSim.git
git branch -M main
git push -u origin main
```

### Step 3: Create gh-pages Branch

```bash
# Create a new orphan branch (separate from main)
git checkout --orphan gh-pages
```

### Step 4: Copy Built Web Files

```bash
# Remove everything except the build
git rm -rf .

# Copy the built web app from build/web/
cp -r rainbow_web/build/web/* .

# Verify index.html exists
ls -la index.html
```

### Step 5: Commit & Push

```bash
git add .
git commit -m "Deploy web app"
git push -u origin gh-pages
```

### Step 6: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Scroll to **Pages** (left sidebar)
4. Under "Source", select:
   - Branch: `gh-pages`
   - Folder: `/ (root)`
5. Click **Save**

### Step 7: Get Your URL

GitHub will show you the URL in the Pages section:

```
Your site is published at: https://yourusername.github.io/RainbowSim/
```

Open it in your browser! 🎉

---

## 🔄 Update Your App

After making changes to your code:

```bash
# 1. Go back to main branch
git checkout main

# 2. Make your changes and commit
git add .
git commit -m "Update simulations"

# 3. Rebuild for web
cd rainbow_web
pygbag main.py
cd ..

# 4. Switch to gh-pages
git checkout gh-pages

# 5. Copy new build
cp -r rainbow_web/build/web/* .

# 6. Commit and push
git add .
git commit -m "Update deployment"
git push origin gh-pages

# 7. Back to main for next changes
git checkout main
```

Or create a simple script to automate this:

```bash
#!/bin/bash
# Save as: deploy.sh

cd rainbow_web
pygbag main.py
cd ..

git checkout gh-pages
cp -r rainbow_web/build/web/* .
git add .
git commit -m "Auto-deploy web app"
git push origin gh-pages
git checkout main

echo "✅ Deployed to GitHub Pages!"
```

Then just run: `bash deploy.sh`

---

## ⚙️ Troubleshooting

### "Page not found" (404)

- Wait 1-2 minutes for GitHub Pages to build
- Verify `index.html` exists in your `gh-pages` branch
- Check Settings → Pages shows `gh-pages` branch

### Simulations not loading

- Check browser console (F12 → Console)
- Look for JavaScript errors
- Verify all files were copied (`ls rainbow_web/build/web/`)

### Old version showing

- Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Or clear browser cache
- Wait 5 minutes for GitHub to refresh

### Build fails locally

```bash
# Delete cache and rebuild
rm -rf .pygbag_cache
rm -rf rainbow_web/.pygbag_cache
cd rainbow_web
pygbag main.py
```

---

## 🎯 Your GitHub Pages URL

Once deployed, your app lives at:

```
https://yourusername.github.io/RainbowSim/
```

Share this URL with anyone! They can interact with all 6 simulations in their browser.

---

## 💡 Tips

- **Minified builds**: For faster loading, use `pygbag main.py --minify`
- **Custom domain**: Buy a domain and point it to GitHub Pages (see GitHub docs)
- **Multiple projects**: Create different repos, each gets its own GitHub Pages site

---

## 📞 Need Help?

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Pygbag GitHub](https://github.com/pygame-web/pygbag)
- [Pygame Documentation](https://www.pygame.org/docs/)

---

**You're all set! 🌈 Your app is now on the internet!**
