-- Add META_LEAD to InquirySource enum (Meta / Facebook Lead Ads via n8n webhook)
ALTER TYPE "inquiry_pooler"."InquirySource" ADD VALUE IF NOT EXISTS 'META_LEAD';
