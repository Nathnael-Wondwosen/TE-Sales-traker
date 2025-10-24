# Sales Tracker Application

A robust and fast sales tracking application with role-based access control built with Next.js, MongoDB, and TypeScript.

## Features

- **Role-based Access Control**: Admin, Supervisor, and Agent roles with appropriate permissions
- **Customer Management**: Track customer information and interactions
- **Call Tracking**: Record call duration, status, and notes
- **Follow-up Management**: Track follow-up status for each customer
- **Supervisor Review**: Supervisors can review agent interactions and add comments
- **User Management**: Admins can manage users and their roles
- **Real-time Notifications**: Get notified of new interactions
- **Performance Optimized**: Caching and efficient database queries

## Getting Started

First, ensure you have MongoDB running locally, then set up the environment variables:

1. Copy `.env` to `.env.local` and update the values
2. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Default Users

After initializing the database, you can log in with these credentials:

- **Admin**: admin@example.com / admin123
- **Supervisor**: supervisor@example.com / supervisor123
- **Agent**: agent@example.com / agent123

## Initialize Database

Visit [http://localhost:3000/api/init](http://localhost:3000/api/init) to initialize the database with sample data.

## Health Check

Visit [http://localhost:3000/api/health](http://localhost:3000/api/health) to check the application health.

## Deploying to Vercel

Follow these steps to deploy reliably on Vercel:

1. **Prepare the repository**
   - Push this project to GitHub/GitLab/Bitbucket.

2. **Create the Vercel project**
   - In Vercel, click "Add New Project" → Import your repository.
   - Framework preset: Next.js (auto-detected).
   - Build settings (defaults are fine):
     - Install Command: `npm ci`
     - Build Command: `next build`
     - Output Directory: `.next`

3. **Configure environment variables** (Project Settings → Environment Variables)
   - Set in both Preview and Production environments:
     - `MONGODB_URI` → your MongoDB connection string
     - `MONGODB_DB` → database name (e.g., `Sales-Tracker`)
     - `NEXTAUTH_SECRET` → secure random string
     - `NEXTAUTH_URL` → your site URL (e.g., `https://your-domain.com` for Production)
   - Generate a secret locally if needed:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. **Domains**
   - Add your custom domain in Project Settings → Domains.
   - Ensure `NEXTAUTH_URL` in Production matches this domain.

5. **Deploy**
   - Commit and push to your main branch. Vercel will build and deploy automatically.
   - Preview deployments will have their own URLs; you can set `NEXTAUTH_URL` per environment.

6. **Post-deploy checks**
   - Visit `/api/health` to verify a healthy deployment.
   - Test `/login`, `/admin`, `/agent`, `/supervisor` routes.

Notes:
- Lint warnings will not fail builds (`eslint.ignoreDuringBuilds` enabled), but TypeScript type checks still run.
- The app avoids logging secrets in production.
- Make sure your MongoDB connection string is properly formatted and accessible from Vercel.

## Troubleshooting Vercel Deployment

If you encounter issues during deployment:

1. **Navbar appearing on login page**: This has been fixed by conditionally rendering the Navigation component based on the current route.

2. **Authentication errors**: 
   - Ensure `NEXTAUTH_SECRET` is set correctly in Vercel environment variables
   - Verify `NEXTAUTH_URL` matches your deployment URL exactly
   - Check that MongoDB connection string is accessible from Vercel

3. **MongoDB connection issues**:
   - Verify your MongoDB Atlas cluster has IP whitelist configured for Vercel (0.0.0.0/0)
   - Check that your database user has proper read/write permissions

4. **Build errors**:
   - Check the Vercel build logs for specific error messages
   - Ensure all environment variables are properly set

```
