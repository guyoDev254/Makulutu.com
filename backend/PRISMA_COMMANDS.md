# 🔧 Prisma Commands Reference

## ✅ Correct Commands

### Generate Prisma Client
```bash
cd backend
yarn prisma generate
# or
npx prisma generate
```

### Database Migrations

**Create and apply migration:**
```bash
yarn prisma migrate dev --name migration_name
# or
npx prisma migrate dev --name migration_name
```

**Push schema to database (without migrations):**
```bash
yarn prisma db push
# or
npx prisma db push
```

**Apply migrations (production):**
```bash
yarn prisma migrate deploy
# or
npx prisma migrate deploy
```

### Seed Database
```bash
yarn prisma:seed
# or
npx prisma db seed
```

### Prisma Studio (Database GUI)
```bash
yarn prisma studio
# or
npx prisma studio
```

## 🐛 Common Mistakes

❌ **Wrong:** `npx prism db push`  
✅ **Correct:** `npx prisma db push`

❌ **Wrong:** `prisma generate`  
✅ **Correct:** `yarn prisma generate` or `npx prisma generate`

## 📋 Quick Reference

| Command | Description |
|---------|-------------|
| `yarn prisma generate` | Generate Prisma Client |
| `yarn prisma migrate dev` | Create and apply migration |
| `yarn prisma db push` | Push schema changes (dev) |
| `yarn prisma migrate deploy` | Apply migrations (prod) |
| `yarn prisma:seed` | Seed database |
| `yarn prisma studio` | Open database GUI |

---

**Use `prisma` not `prism`!** ✅
