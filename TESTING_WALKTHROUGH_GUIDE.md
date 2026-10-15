# Oakland Schools — End-to-End Testing & Workflow Runbook

> **Academic Session:** 2026/2027 &bull; **Location:** Victoria Island, Lagos, Nigeria  
> **Institutional Structure:** Strictly 6 Classes (JSS 1, JSS 2, JSS 3, SS 1, SS 2, SS 3) &bull; 236 Enrolled Pupils  
> **Development Server:** `http://localhost:3000`

---

## 1. Core Personas & Fast Sign-In Credentials

All roles can be accessed with **1-Click** on the login page: [`http://localhost:3000/login`](http://localhost:3000/login).

| Persona | Name | Designated Role | Portal Path |
|---|---|---|---|
| **Class Teacher** | Mr. David Ade (`OAK-CT-003`) | JSS 3 Homeroom + Basic Science | [`/teacher`](http://localhost:3000/teacher) |
| **Principal** | Dr. Mrs. Beatrice O. (`OAK-ADM-001`) | Academic Head & Faculty Supervision | [`/admin`](http://localhost:3000/admin) |
| **Proprietor** | Chief A. Adeleke | Supreme Executive & Governing Council | [`/proprietor`](http://localhost:3000/proprietor) |
| **Bursar** | Mr. Lateef Sanusi (`OAK-BUR-001`) | Head of Accounts & School Treasury | [`/bursar`](http://localhost:3000/bursar) |

---

## 2. Complete End-to-End Workflow Testing Sequence

Follow this step-by-step sequence to test the entire institutional lifecycle from admissions to email report card dispatch and payroll:

```
[Parent Applies Online] ──► [Principal Screens] ──► [Bursar Bills Fees & Issues Receipt]
                                                                  │
                                                                  ▼
[Proprietor Dispatches to Parent Email] ◄── [Principal Vets] ◄── [Teacher Rates & Enters Scores]
```

### Step 1: Public Prospective Parent Application
1. Open [`http://localhost:3000/admissions`](http://localhost:3000/admissions).
2. Complete the online admission form for a child applying for JSS 1, JSS 2, or JSS 3.
3. Click **"Submit Application & Generate Photo Card"**.
4. **Verification:**
   - An automated Application Number is generated (e.g. `ADM-2026-042`).
   - The official **Oakland Schools Entrance Examination Slip & Candidate Photo Card** appears.
   - Click **"Print Exam Slip"** to preview the printable slip with examination date (Saturday, 10th October 2026, 08:30 AM).

---

### Step 2: Principal Reviews Admission Pipeline
1. Go to [`http://localhost:3000/login`](http://localhost:3000/login) and click **"Principal &bull; Dr. Mrs. Beatrice O."**.
2. Open [`http://localhost:3000/admin/admissions`](http://localhost:3000/admin/admissions).
3. **Verification:**
   - Review incoming applications for JSS 1 through SS 3.
   - Update interview scheduling and screening scores.

---

### Step 3: Bursar Collects School Fees & Prints Stamped Receipt
1. Go to [`http://localhost:3000/login`](http://localhost:3000/login) and click **"Bursar &bull; Mr. Lateef Sanusi"**.
2. Open [`http://localhost:3000/bursar/fees`](http://localhost:3000/bursar/fees).
3. Click **"Record Fee Payment"** or click **"View Receipt"** on an enrolled student (e.g. Chidera Emeka Okafor, JSS 3).
4. **Verification:**
   - The official stamped Oakland Schools fee receipt opens with:
     - School crest & watermark.
     - Receipt number (e.g. `REC-2026-0891`).
     - Breakdown of Tuition, Development, ICT, and Science levies.
     - Amount in words: *"One Hundred and Ninety-Five Thousand Naira Only"*.
     - Stamped seal of **OAKLAND SCHOOLS BURSARY** and Mr. Lateef Sanusi's signature.
     - Click **"Print Official Receipt"** to verify the clean print layout.

---

### Step 4: Class Teacher Morning Attendance
1. Go to [`http://localhost:3000/login`](http://localhost:3000/login) and click **"Class Teacher &bull; Mr. David Ade"**.
2. Open [`http://localhost:3000/teacher/attendance`](http://localhost:3000/teacher/attendance).
3. **Verification:**
   - **Zero-Friction Design:** All 28 JSS 3 homeroom students are marked **Present by default**.
   - Tap only the 1 or 2 absent/late students.
   - Click **"Save Daily Attendance"** &rarr; instantly logs the daily roll call.

---

### Step 5: Class Teacher Gradebook & Report Card Compilation
1. In the Teacher Portal, open [`http://localhost:3000/teacher/scores`](http://localhost:3000/teacher/scores).
   - Enter CA 1 (20%), CA 2 (20%), and Exam (60%).
   - Notice the automatic total derivation and Nigerian secondary school grade letter (A+, A, B, C, P, F).
2. Open [`http://localhost:3000/teacher/report-cards`](http://localhost:3000/teacher/report-cards).
   - Select student **Chidera Emeka Okafor** (1st of 28).
   - **Interactive 1–5 Rating Editor:** Click the interactive rating pills for:
     - **Affective Domain:** Punctuality (5), Neatness (5), Honesty (5), Leadership (5).
     - **Psychomotor Skills:** Handwriting (5), Lab Practical (5), Sports (4).
   - Use the smart comment chips or type your personal homeroom teacher comment.
   - Click **"Save Evaluation"** &rarr; changes are committed with confirmation.
   - Click **"Forward to Principal for Vetting"** &rarr; locks class teacher tier and routes to Dr. Mrs. Beatrice O.

---

### Step 6: Principal Report Card Academic Vetting
1. Switch to [`http://localhost:3000/admin/results`](http://localhost:3000/admin/results) as **Principal Dr. Mrs. Beatrice O.**.
2. **Verification:**
   - Inspect the JSS 3 batch submitted by Mr. David Ade.
   - Inspect Chidera's 1–5 trait scores and teacher remark.
   - Enter or adjust the **Principal's Vetting Remark** (*e.g. "An exceptional academic outcome reflecting discipline and high intellectual capacity. Recommended for executive academic commendation."*).
   - Click **"Recommend & Forward to Proprietor for Final Seal"**.

---

### Step 7: Proprietor Executive Seal & Parent Email Dispatch
1. Go to [`http://localhost:3000/login`](http://localhost:3000/login) and click **"Proprietor &bull; Chief A. Adeleke"**.
2. Open [`http://localhost:3000/proprietor/results`](http://localhost:3000/proprietor/results).
3. **Verification:**
   - View the 6 classes summary table (strictly 236 pupils across JSS 1 – SS 3).
   - Click **"Inspect Sample Report Card"** &rarr; displays the full report card with Principal's and Proprietor's seals.
   - Click **"Seal & Dispatch to All 236 Parents"**:
     - Formally applies Chief A. Adeleke's executive seal.
     - Automatically dispatches official signed PDF report cards directly to all **236 registered parent email addresses**.
   - Click **"Preview Parent Email"**:
     - Inspects the exact branded email received in the parent's inbox with academic summary, Principal & Proprietor sign-offs, and attached `Official_Report_Card_Chidera_Okafor_JSS3.pdf`.
   - Inspect the **Live Parent Email Dispatch Stream** showing real-time delivery statuses (*Delivered*, *Opened by Parent*).

---

### Step 8: School Finances, Staff Payroll & OpEx Diesel Vouchers
1. Open [`http://localhost:3000/proprietor/finances`](http://localhost:3000/proprietor/finances) or [`http://localhost:3000/bursar/payroll`](http://localhost:3000/bursar/payroll).
2. **Staff Salaries (24 Personnel):**
   - Notice the 6 appointed Class Teachers each receive their **+₦35,000 Monthly Responsibility Allowance**.
   - Click **"Adjust"** on any staff member &rarr; edit basic pay or allowances with live statutory recalculation of Lagos PAYE tax (10%) and pension (8%).
   - Click **"Payslip"** &rarr; opens and prints the official Oakland Schools payslip.
   - Click **"Export CBN NIP Schedule"** &rarr; downloads bulk bank payment CSV for Nigerian commercial banks.
   - Click **"Authorize & Disburse Monthly Payroll"** &rarr; approves the ₦3.16M monthly net salary.
3. **School Expenditures (OpEx):**
   - Open [`/bursar/expenditures`](http://localhost:3000/bursar/expenditures).
   - Review vouchers for 3,000L diesel for the 150kVA Perkins generator (₦3.30M), science lab chemicals (₦780k), MainOne fiber link (₦450k), and exam test booklets (₦620k).
   - Click **"Print Voucher"** on diesel expenditure (`VCH-2026-041`) &rarr; displays official accounting voucher with Bursar, Principal, and Proprietor signatures.
4. **Bursary Petty Cash Desk:**
   - Open [`/bursar/petty-cash`](http://localhost:3000/bursar/petty-cash).
   - Record petty cash disbursements for daily school emergencies, laboratory supplies, and logistics with instant real-time balance audit.

---

## 3. How to Clean / Reset the Database

Whenever you wish to reset your Supabase database to a clean Day-1 state before testing:

1. Open your **Supabase Dashboard** at [supabase.com](https://supabase.com).
2. Navigate to your project: **`gxkywfgoitfjyuipkmqj`**.
3. Open the **SQL Editor**.
4. Open or copy the script: [`supabase/clean_test_reset.sql`](file:///c:/Users/USER/Desktop/Oakland-school/supabase/clean_test_reset.sql).
5. Click **"Run"**.
   - Cleans all transactional records (scores, attendance, audit logs, admissions).
   - Preserves Oakland Schools tenant, active 2026/2027 session, and strictly 6 classes.
