/** Assignment notification payload from GET /api/inquiries/notifications/assignments */

export type AssignmentNotificationItem = {
  id: string;
  customerName: string;
  country: string | null;
  message: string | null;
  lookingFor: string | null;
  assignedAt: string;
};
