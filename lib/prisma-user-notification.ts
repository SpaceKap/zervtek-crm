import { prisma } from "@/lib/prisma"

/**
 * UserNotification delegate. Some Docker/Next typecheck paths resolve @prisma/client
 * before prisma generate finishes updating typings; runtime always has the model.
 */
export function prismaUserNotification(): UserNotificationDelegate {
  return (prisma as unknown as { userNotification: UserNotificationDelegate })
    .userNotification
}

interface UserNotificationDelegate {
  findMany(args: object): Promise<unknown[]>
  count(args: object): Promise<number>
  updateMany(args: object): Promise<{ count: number }>
  create(args: object): Promise<unknown>
}
