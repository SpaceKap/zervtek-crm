# Vehicle Shipping System Implementation

## Overview

This document outlines the implementation of the vehicle shipping management system with stage tracking, document management, and transaction tracking.

## Database Schema Changes

### New Enums

- `ShippingStage`: PURCHASE, TRANSPORT, PAYMENT, REPAIR, DOCUMENTS, BOOKING, SHIPPED, DHL
- `BookingType`: RORO, CONTAINER
- `BookingStatus`: PENDING, CONFIRMED
- `TransactionType`: BANK_TRANSFER, PAYPAL, CASH, WISE
- `TransactionDirection`: INCOMING, OUTGOING
- `DocumentCategory`: Comprehensive list of document types (AUCTION_DETAILS, FINAL_BID, EXPORT_CERTIFICATE, etc.)

### New Models

1. **VehicleShippingStage**: Tracks all stage-specific data for each vehicle
2. **VehicleStageCost**: Tracks costs per stage (auction fees, transport fees, etc.)
3. **VehicleDocument**: Stores documents attached to vehicles (stage-specific or general)
4. **VehicleStageHistory**: Audit trail of stage changes
5. **Transaction**: Centralized transaction tracking (incoming/outgoing)
6. **Yard**: Storage yard management

### Updated Models

- **Vehicle**: Added `customerId`, `currentShippingStage`, `isRegistered`
- **Customer**: Added `shareToken` for public portal access
- **Vendor**: Added `email` for auto-sending documents
- **User**: Added `ACCOUNTANT` role

## API Routes Created

### Vehicle Routes

- `GET/POST /api/vehicles` - List/create vehicles with filtering
- `GET/PATCH /api/vehicles/[id]/stages` - Get/update shipping stage
- `GET/POST /api/vehicles/[id]/documents` - Manage documents
- `GET/POST /api/vehicles/[id]/costs` - Manage stage costs
- `PATCH/DELETE /api/vehicles/[id]/costs/[costId]` - Update/delete costs
- `GET/PATCH /api/vehicles/[id]/payments` - Payment tracking

### Transaction Routes

- `GET/POST /api/transactions` - List/create transactions with filtering
- `GET/PATCH/DELETE /api/transactions/[id]` - Manage transactions

### Other Routes

- `GET/POST /api/yards` - Yard management
- `POST /api/customers/[id]/share-token` - Generate customer share token
- `GET /api/public/customers/[token]/vehicles` - Public customer portal

## Shipping Stages Implementation

### 1. Purchase Stage

- Track auction/purchase fees with vendor
- Store auction details, final bid, invoice documents

### 2. Transport Stage

- Select storage yard
- Track transport arranged, yard notified, photos requested
- Store transport fees and inspection fees (separate vendors)
- ETD/ETA tracking

### 3. Payment Stage

- Track total charges and total received
- Calculate balance due
- Link to customer invoices

### 4. Repair Stage (Skippable)

- Track repair/storage costs with vendor
- Comment section for updates/photos/invoices

### 5. Documents Stage

- **Registered vehicles**: Number plates received, deregistration, export certificate (NOT SKIPPABLE), deregistration sent to auction, insurance refund
- **Unregistered vehicles**: Export certificate creation/upload (NOT SKIPPABLE)
- **Accessories section**: Spare keys, maintenance records, manuals, catalogues, accessories, other items

### 6. Booking Stage

- Select Container or RoRo
- Select shipping agent (vendor)
- Booking requested confirmation
- Booking status (pending/confirmed)
- **Common fields**: Booking number, POD, POL, Vessel Name, Voyage No., ETD, ETA, notes
- **Container-specific**: Container number, container size, seal number, units inside
- **Documentation tasks**: Send SI/EC to forwarder (auto-email), confirm SO receipt

### 7. Shipped Stage

- Forwarding fees and freight costs (separate vendors)
- BL copy upload, BL details confirmed, BL paid
- LC copy upload (for Sri Lanka)
- Export declaration upload
- Recycle application
- BL release notice (2 weeks before destination)
- BL released

### 8. DHL Stage

- DHL tracking number

## Permissions

### New Permission Functions

- `canViewVehicles()`: MANAGER, ADMIN, BACK_OFFICE_STAFF, ACCOUNTANT
- `canViewTransactions()`: MANAGER, ADMIN, ACCOUNTANT
- `canManageTransactions()`: MANAGER, ADMIN, ACCOUNTANT
- `canManageVehicleStages()`: MANAGER, ADMIN, BACK_OFFICE_STAFF

## Next Steps - UI Components Needed

1. **Vehicle Database Page** (`/dashboard/vehicles`)
   - List all vehicles with filtering (stage, customer, date range)
   - Show current stage, customer, VIN, make/model
   - Link to vehicle detail page

2. **Vehicle Detail Page** (`/dashboard/vehicles/[id]`)
   - Stage management interface
   - Cost tracking per stage
   - Document upload/management
   - Payment tracking
   - Stage history/audit trail

3. **Transaction Management Page** (`/dashboard/transactions`)
   - Separate tabs for incoming/outgoing
   - Filter by type, vendor, customer, date range
   - Calendar date picker
   - Create/edit/delete transactions
   - Attach invoices

4. **Public Customer Portal** (`/public/customers/[token]`)
   - Show customer's vehicles
   - Current stage of each vehicle
   - Documents visible to customer
   - Invoice status

5. **Accountant Dashboard** (`/dashboard/accountant`)
   - Vehicle database access with all documents
   - Filter vehicles by date range
   - Incoming payments view
   - Outgoing payments view
   - Transaction management

## Notes

- Paperless integration was cancelled per user request
- All costs require vendors except payment processing
- Export certificate is NOT SKIPPABLE for both registered and unregistered vehicles
- SI/EC auto-email uses vendor email from shipping agent selection
- Customer share tokens are generated via API and can be shared publicly
