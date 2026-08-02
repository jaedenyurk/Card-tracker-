# Card Business Tracker

A private dashboard for your sports card business: revenue, expenses, P&L, inventory, and ROI (per card and all-time), with monthly/yearly charts. Built with Next.js, Prisma, and Postgres, meant to be deployed on Vercel.

The whole site is protected by a single password (you set it), since it holds real business numbers and lives at a public URL.

## How the numbers work

- Every card's **cost basis** = purchase price + any expenses you link to that card (e.g. a grading fee).
- A card's cost basis counts as **inventory** (an asset) until it sells. Once sold, that cost basis becomes **COGS** and is recognized as an expense in the same month as the sale.
- **Expenses not linked to a card** (shipping supplies, subscriptions, travel to a show, etc.) count as operating expenses in the month you log them.
- **Net P&L** = Total Revenue − (COGS + Operating Expenses).
- **ROI per card** is realized (profit ÷ cost basis) once sold, or unrealized (based on an optional "estimated current value" you can set) while held.
- **Overall ROI** blends realized profit on sold cards with unrealized profit on held cards (only for cards where you've entered an estimated value).

## Deploying to Vercel (step by step)

You'll need a free [GitHub](https://github.com) account and a free [Vercel](https://vercel.com) account (Vercel lets you sign up directly with GitHub).

### 1. Push this project to GitHub

If you don't already have this folder in a git repo, open a terminal in the `card-tracker` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
```

Then create a new empty repository on GitHub (github.com → New repository — don't initialize it with a README), and follow the "push an existing repository" instructions it shows you, e.g.:

```bash
git remote add origin https://github.com/YOUR_USERNAME/card-tracker.git
git branch -M main
git push -u origin main
```

### 2. Import the project into Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Click **Import** next to the `card-tracker` repo.
3. Leave the framework preset as **Next.js**. Don't click Deploy yet — add the database and environment variables first (steps 3–4), otherwise the first build will fail.

### 3. Add a Postgres database

1. In your new Vercel project, go to the **Storage** tab.
2. Click **Create Database** → choose **Postgres** (powered by Neon) → follow the prompts to create it and connect it to this project.
3. Once connected, go to **Settings → Environment Variables** and check what got added automatically. You should see variables like `POSTGRES_URL` and `POSTGRES_PRISMA_URL`.
4. This app expects a variable named exactly **`DATABASE_URL`**. If it's not already there, add one:
   - Name: `DATABASE_URL`
   - Value: copy the value from `POSTGRES_PRISMA_URL` (it includes connection pooling, which works best on Vercel)
   - Environment: all (Production, Preview, Development)

### 4. Add the remaining environment variables

Still in **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `APP_PASSWORD` | Whatever password you want to use to log into the site |
| `SESSION_SECRET` | Any long random string (e.g. generate one at [1password.com/password-generator](https://1password.com/password-generator) or run `openssl rand -base64 32` in a terminal) |

### 5. Deploy

Go to the **Deployments** tab and trigger a deploy (or push a new commit — Vercel deploys automatically on every push to `main`). The build automatically creates the database tables for you (via `prisma migrate deploy`), so there's nothing else to set up.

### 6. (Optional) Load sample data

To see the dashboard populated with example cards and expenses instead of starting empty, run this once from your computer (with [Node.js](https://nodejs.org) installed):

```bash
npm install
npx vercel env pull .env       # pulls your live DATABASE_URL into a local .env file
npm run db:seed
```

This only inserts data if the database is currently empty, so it's safe to run once after your first deploy. Delete the sample cards from the Inventory page whenever you're ready to start entering your real ones.

## Using the app day to day

- **Dashboard** — KPIs (revenue, expenses, net P&L, ROI, portfolio value) plus monthly/yearly revenue-vs-expenses charts and your best/worst performing cards.
- **Inventory** — every card you've logged, sortable by cost, value, profit, or ROI, filterable by held/sold. Click a card to see full details, mark it sold, update its estimated value, log a grading/shipping fee against it, or delete it.
- **Expenses** — general business expenses (supplies, subscriptions, travel, fees) and card-linked expenses in one place, filterable by category.

## Running it locally (optional)

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, APP_PASSWORD, SESSION_SECRET
npm run db:push           # creates tables in whatever database DATABASE_URL points to
npm run db:seed           # optional sample data
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000). For local development you can point `DATABASE_URL` at any Postgres database (a free one from [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com) works fine, or Postgres running in Docker).

## Running the tests

The revenue/ROI/P&L calculation logic has a unit test suite with no external dependencies:

```bash
npm test
```
