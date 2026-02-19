import { prisma } from "../lib/prisma"
import { UserRole } from "@prisma/client"

/**
 * Script to change user roles for testing purposes
 *
 * Local:
 *   npx tsx scripts/change-role.ts <email> <role>
 *
 * On VPS (Docker): DATABASE_URL uses host "postgres", so run inside the app container:
 *   docker compose run --rm inquiry-pooler npx tsx scripts/change-role.ts <email> <role>
 *
 * Examples:
 *   npx tsx scripts/change-role.ts user@example.com ADMIN
 *   npx tsx scripts/change-role.ts bhanuka@zervtek.com BACK_OFFICE_STAFF
 *   npx tsx scripts/change-role.ts --list
 */

async function changeUserRole(email: string, role: UserRole) {
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { role },
      create: { email, role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })
    console.log(`✅ Successfully updated user:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Name: ${user.name || "N/A"}`)
    console.log(`   New Role: ${user.role}`)
    return user
  } catch (error: any) {
    if (error.code === "P2025") {
      console.error(`❌ User with email "${email}" not found`)
    } else {
      console.error(`❌ Error updating user:`, error.message)
    }
    process.exit(1)
  }
}

async function listUsers() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true,
    },
    orderBy: {
      email: "asc",
    },
  })

  if (users.length === 0) {
    console.log("No users found in database")
    return
  }

  console.log("\n📋 Current users:")
  console.log("─".repeat(60))
  users.forEach((user) => {
    console.log(`  ${user.email.padEnd(30)} ${(user.name || "N/A").padEnd(20)} ${user.role}`)
  })
  console.log("─".repeat(60))
  console.log(`\nTotal: ${users.length} user(s)\n`)
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
Usage:
  npx tsx scripts/change-role.ts <email> <role>
  npx tsx scripts/change-role.ts --list

On VPS (Docker): run inside the app container so DB host "postgres" resolves:
  docker compose run --rm inquiry-pooler npx tsx scripts/change-role.ts <email> <role>
  docker compose run --rm inquiry-pooler npx tsx scripts/change-role.ts --list

Examples:
  npx tsx scripts/change-role.ts user@example.com ADMIN
  npx tsx scripts/change-role.ts bhanuka@zervtek.com BACK_OFFICE_STAFF
  npx tsx scripts/change-role.ts --list

Available roles: ${Object.values(UserRole).join(", ")}
`)
    process.exit(0)
  }

  if (args[0] === "--list" || args[0] === "-l") {
    await listUsers()
    process.exit(0)
  }

  if (args.length < 2) {
    console.error("❌ Error: Please provide both email and role")
    console.log("Usage: npx tsx scripts/change-role.ts <email> <role>")
    console.log("Run with --help for more information")
    process.exit(1)
  }

  const email = args[0]
  const roleInput = args[1].toUpperCase()

  // Validate role
  const validRoles = Object.values(UserRole)
  if (!validRoles.includes(roleInput as UserRole)) {
    console.error(`❌ Invalid role: ${roleInput}`)
    console.log(`Valid roles are: ${validRoles.join(", ")}`)
    process.exit(1)
  }

  await changeUserRole(email, roleInput as UserRole)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error("❌ Unexpected error:", error)
  process.exit(1)
})
