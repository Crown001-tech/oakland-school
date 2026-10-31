# Eductive Commercial Pricing Discussion Draft

> [!CAUTION]
> **INTERNAL DRAFT FOR FOUNDER REVIEW — DO NOT DISTRIBUTE OR SEND.**
> Pricing and tier structures are subject to executive approval. Features listed below reflect current platform capabilities versus planned development milestones.

---

### Proposed Subscription Tiers (Per-Student, Billed Termly)

Subscriptions are billed termly based on actual enrolled students in the school's database.

| Category | **Starter** (Proposed: ₦1,500 / student / term) | **Growth** (Proposed: ₦2,500 / student / term) |
| :--- | :--- | :--- |
| **Target Profile** | Schools seeking core SIS, grades & attendance | Schools needing integrated fee receipting & gate PIN security |
| **Portals Included** | Proprietor, Admin, Teacher, Student | All Portals (including Bursar, Parent, Security) |
| **Student Records (SIS)** | Active Roster, Class Enrollments | Active Roster, Class Enrollments |
| **Continuous Assessment** | 20/20/60 Score Entry & Locking | 20/20/60 Score Entry & Locking |
| **Attendance Roll Call** | Daily Class Attendance Marking | Daily Class Attendance Marking |
| **Fee Ledger** | Basic record keeping | **Atomic Transaction Ledger (`record_fee_payment_tx`) + Sequential Receipts** |
| **Gate Pickup Security** | — | **4-Digit Verified Parent/Guardian Pickup PIN** |
| **Staff Directory & Roles** | Included | Included + Per-role permissions |
| **Support SLA** | Standard Email Support | Priority Email & Working-Hours Support |

---

### Roadmap Items (Planned for Subsequent Milestones — Not Sold Yet)
* *Payment Gateway Automated Sub-Accounts (Paystack / Flutterwave)*: Planned for M3.
* *WhatsApp & SMS Automated Broadcast Engine (Termii)*: Planned for M3.
* *Automated PDF Report Card Generation & Offline Teacher PWA*: Planned for M5/M6.

---

### Notes & Boundaries
1. **Zero Biometrics**: Biometric hardware/scanners are explicitly out of scope; gate security relies strictly on verified 4-digit pickup PINs.
2. **Architecture**: All tiers operate on the secure multi-tenant cloud architecture with strict Row-Level Security (RLS) data isolation.
