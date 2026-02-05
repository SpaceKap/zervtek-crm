import { UserRole, InquirySource, InquiryStatus, ShippingStage, BookingType, BookingStatus, TransactionType, TransactionDirection, DocumentCategory } from '@prisma/client'

export type { UserRole, InquirySource, InquiryStatus, ShippingStage, BookingType, BookingStatus, TransactionType, TransactionDirection, DocumentCategory }

export interface InquiryWithRelations {
  id: string
  source: InquirySource
  sourceId: string | null
  customerName: string | null
  email: string | null
  phone: string | null
  message: string | null
  lookingFor: string | null
  status: InquiryStatus
  assignedToId: string | null
  assignedAt: Date | null
  metadata: any
  createdAt: Date
  updatedAt: Date
  assignedTo?: {
    id: string
    name: string | null
    email: string
  } | null
}

export interface KanbanStageData {
  id: string
  name: string
  order: number
  color: string | null
  status: InquiryStatus
  inquiries: InquiryWithRelations[]
}

export interface N8nWebhookPayload {
  source: 'whatsapp' | 'email' | 'web' | 'chatbot' | 'jct stock inquiry' | 'jct_stock_inquiry' | 'onboarding form' | 'onboarding_form' | 'contact us inquiry form' | 'contact_us_inquiry_form'
  sourceId?: string
  customerName?: string
  email?: string
  phone?: string
  message?: string
  lookingFor?: string
  metadata?: Record<string, any>
}
