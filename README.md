# Hoops Tracker

A simple, personal basketball game tracker. Pick a match type (1v1 up to 5v5, any mix),
run a timer, log shots by type (1pt, 2pt, 3pt, half-court 3pt), track the winner, and
run free games or full tournaments. Everything is saved on your device.

## Deploy your own copy (GitHub + Vercel)

1. **Create a GitHub repo**
   - Go to github.com → New repository → name it `hoops-tracker` → Create.

2. **Push this folder to it**
   ```bash
   cd hoops-tracker
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/hoops-tracker.git
   git push -u origin main
   ```

3. **Deploy on Vercel**
   - Go to vercel.com → Add New → Project
   - Import your `hoops-tracker` GitHub repo
   - Framework preset: **Other** (no build step needed)
   - Click Deploy

4. **Add to your home screen**
   - Open the Vercel URL on your phone (Safari on iOS, Chrome on Android)
   - iOS: tap Share → Add to Home Screen
   - Android: tap the menu (⋮) → Add to Home screen / Install app
   - It'll open full-screen like a native app, with an icon and everything.

Your data (matches + tournaments) is stored locally on each device using
`localStorage`, so it stays private to you and persists between visits.
