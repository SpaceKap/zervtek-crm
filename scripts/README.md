# Testing Scripts

## Change User Role

Quickly change user roles for testing different views in the CRM.

### Usage

```bash
# Change a user's role
npm run change-role <email> <role>

# List all users and their roles
npm run list-users
```

### Examples

```bash
# Make a user an admin
npm run change-role user@example.com ADMIN

# Make a user a manager
npm run change-role user@example.com MANAGER

# Make a user a sales staff
npm run change-role user@example.com SALES

# List all users
npm run list-users
```

### Available Roles

- `SALES` - Sales staff (default for new users)
- `MANAGER` - Manager (can view all inquiries, stats, manager dashboard)
- `ADMIN` - Admin (can do everything managers can + manage users)

### Testing Different Views

1. **Sign in with a Google account** (creates user with SALES role)
2. **Change the role** using the script:
   ```bash
   npm run change-role your-email@gmail.com ADMIN
   ```
3. **Sign out and sign back in** to see the updated view
4. **Check navigation** - different roles see different menu items

### Quick Test Setup

```bash
# 1. List current users
npm run list-users

# 2. Change roles for testing
npm run change-role user1@example.com SALES
npm run change-role user2@example.com MANAGER
npm run change-role user3@example.com ADMIN

# 3. Sign in with each account to test their views
```
