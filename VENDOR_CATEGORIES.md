# Vendor Categories

This document lists all vendor categories and their usage in shipping stages.

## Vendor Categories

### 1. **Dealership** (`DEALERSHIP`)

- **Used in:** Purchase Stage
- **Purpose:** Dealerships for vehicle purchases
- **Description:** Companies that sell vehicles directly (dealerships)

### 2. **Auction House** (`AUCTION_HOUSE`)

- **Used in:** Purchase Stage
- **Purpose:** Auction houses where vehicles are purchased
- **Description:** Auction companies like USS, JAA, etc.

### 3. **Transport Vendor** (`TRANSPORT_VENDOR`)

- **Used in:** Transport Stage
- **Purpose:** Vendors for inland transport fees
- **Description:** Companies that transport vehicles from auction/purchase location to storage yard

### 4. **Garage** (`GARAGE`)

- **Used in:** Repair Stage
- **Purpose:** Vendors for repair/storage fees
- **Description:** Garages that provide vehicle repair or storage services

### 5. **Freight Vendor** (`FREIGHT_VENDOR`)

- **Used in:** Booking Stage, Shipped Stage
- **Purpose:** Freight vendors (shipping agent/freight)
- **Description:** Companies that handle freight charges and shipping bookings for RoRo or container shipping

### 6. **Forwarding Vendor** (`FORWARDING_VENDOR`)

- **Used in:** Shipped Stage
- **Purpose:** Vendors for forwarding fees
- **Description:** Companies that handle forwarding services and shared forwarding invoices

## Shipping Stage to Vendor Category Mapping

| Shipping Stage | Available Vendor Categories                          |
| -------------- | ---------------------------------------------------- |
| **Purchase**   | Dealership, Auction House                            |
| **Transport**  | Transport Vendor (Inspections handled by Yard)       |
| **Repair**     | Garage                                               |
| **Documents**  | (No vendor selection in this stage)                  |
| **Booking**    | Freight Vendor                                       |
| **Shipped**    | Forwarding Vendor, Freight Vendor                    |
| **DHL**        | (No vendor selection in this stage)                  |

## Notes

- **Yard Inspections:** Inspections are handled by the Yard vendor. When creating a Yard, you can associate it with a vendor and add the yard's address.
- **Freight Vendor:** Combines the functionality of both shipping agents and freight vendors. Used for booking and freight costs.
- **General Costs:** Non-vehicle related costs (electricity, rent, fuel, etc.) are tracked separately in the General Costs section and can optionally be associated with vendors.

## Implementation Details

- Vendors are automatically filtered by category when selecting vendors in shipping stage forms
- The vendor list page shows all categories and allows filtering by category
- When creating/editing a vendor, you must select a category
- Category-specific vendors only appear in their relevant stages
- Yards can have an associated vendor and address for inspection services
