-- Add REFERRAL to InquirySource enum (for Add New Inquiry and sales pipeline)
ALTER TYPE "inquiry_pooler"."InquirySource" ADD VALUE IF NOT EXISTS 'REFERRAL';
