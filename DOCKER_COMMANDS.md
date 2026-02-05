# Docker Commands for Inquiry Pooler

## Quick Restart (No Rebuild)
```bash
cd ~/inquiry-pooler
docker-compose restart inquiry-pooler
```

## Full Restart (Rebuild Container)
```bash
cd ~/inquiry-pooler
docker-compose down inquiry-pooler
docker-compose up -d --build inquiry-pooler
```

## Restart All Services (Database + App)
```bash
cd ~/inquiry-pooler
docker-compose restart
```

## Rebuild and Restart Everything
```bash
cd ~/inquiry-pooler
docker-compose down
docker-compose up -d --build
```

## View Logs
```bash
# App logs
docker-compose logs -f inquiry-pooler

# Database logs
docker-compose logs -f postgres

# All logs
docker-compose logs -f
```

## Stop Everything
```bash
docker-compose down
```

## Start Everything
```bash
docker-compose up -d
```

## Regenerate Prisma Client Inside Container
```bash
docker-compose exec inquiry-pooler npx prisma generate
```

## Run Scripts Inside Container
```bash
# Check kanban stages
docker-compose exec inquiry-pooler npm run check-kanban

# Run any npm script
docker-compose exec inquiry-pooler npm run <script-name>
```
