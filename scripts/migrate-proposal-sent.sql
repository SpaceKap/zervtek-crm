-- Migration: Update PROPOSAL_SENT status to DEPOSIT
-- Run this before removing PROPOSAL_SENT from the enum

UPDATE "inquiry_pooler"."Inquiry" 
SET status = 'DEPOSIT'::"inquiry_pooler"."InquiryStatus" 
WHERE status = 'PROPOSAL_SENT'::"inquiry_pooler"."InquiryStatus";
