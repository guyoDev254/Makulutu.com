# Quick Fix for Authentication Errors

Follow these steps in order:

## Step 1: Install Required Packages

```bash
cd backend
yarn add @nestjs/jwt @nestjs/passport passport passport-jwt helmet
yarn add -D @types/passport-jwt
```

## Step 2: Generate Prisma Client

After installing packages, regenerate Prisma client to include the Admin model:

```bash
cd backend
yarn prisma generate
```

## Step 3: Run Database Migration

Create the Admin table in your database:

```bash
cd backend
yarn prisma migrate dev --name add_admin_model
```

## Step 4: Seed Admin User

Create the default admin user:

```bash
cd backend
yarn prisma:seed
```

## Step 5: Verify

Restart your backend server:

```bash
cd backend
yarn start:dev
```

The TypeScript errors should now be resolved!

## If Errors Persist

1. **Clear Prisma cache:**
```bash
rm -rf backend/node_modules/.prisma
yarn prisma generate
```

2. **Restart TypeScript server** in your IDE (VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")

3. **Check package.json** - ensure packages are listed in dependencies

## Common Issues

### "Cannot find module '@nestjs/jwt'"
- Make sure you ran `yarn add @nestjs/jwt @nestjs/passport passport passport-jwt`
- Check `node_modules` folder exists
- Try deleting `node_modules` and `yarn.lock`, then `yarn install`

### "Property 'admin' does not exist on type 'PrismaClient'"
- Run `yarn prisma generate` after adding Admin model
- Make sure migration ran successfully
- Check `backend/node_modules/.prisma/client` exists

### Migration errors
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env` is correct
- Verify database exists
