# M3 verification checklist: parent payments and messaging

Work through this top to bottom. Each step says what to run or open, and what you should see.
Paths are relative to `FRONTEND` unless a URL is given. Local addresses assume `pnpm dev` on port 3000.

**What M3 does:** a parent pays fees online through Paystack and the bursar sees the payment matched to the student with nothing typed. The school can part-pay, plan instalments, and give scholarships, discounts and sibling discounts. Parents get WhatsApp or email messages (there is no SMS) for payments, absence, lateness, gate release, results and school notices, plus scheduled fee reminders. Parents activate their own accounts from a link sent to their phone.

**Be clear about what has and has not been tested.** Everything below marked "automated" runs in the test suite against a real Postgres (the migrations are applied for real) with Paystack and Termii replaced by stand-ins. **Nothing has been run against live Paystack, Termii or Resend.** Sections 4 to 9 are how you find out whether the real services behave the way the code assumes. Where the code rests on something I could not confirm, it is marked **UNVERIFIED**.

## 0. Database: migration 031 is applied

`supabase/migrations/031_online_payments_and_messaging.sql` was applied to Oakland's database on 4 November 2026 with your approval. Checked afterwards: all seven new tables exist with 0 rows (nothing is seeded), each has its school-isolation policy (80 in the database in total), and `resolve_student_net_billed` exists.

It adds: `online_payments`, `student_virtual_accounts`, `fee_adjustments`, `fee_instalments`, `message_outbox`, `message_opt_outs`, `parent_invites`, the function `resolve_student_net_billed`, and a replacement of `record_fee_payment_tx` so a payment is checked against the bill after discounts. The browser roles are blocked from the new tables.

- [ ] Any other database (a copy, a second school, production if it is separate) needs it too, **before** this code runs there: `node scripts/apply-migrations.mjs 031` (needs `pg`, see M2 section 0). Without it the parent fees page, the bursar tuition page and the finances API fail.
- [ ] Restart `pnpm dev` after any env change.

## 1. Automated checks (all must pass)

| Run | Expect |
|---|---|
| `pnpm test` | 46 files, 678 tests pass. Close other apps first: the database tests need memory, and a crash with "Array buffer allocation failed" means low memory, not a code error. |
| `npx tsc --noEmit` | no output |
| `npx eslint src tests --quiet` | no output |
| `npx next build` | builds and lists the new routes |
| `node scripts/audit-school-scope.mjs` | "outside the allow-list: 0" and "Hardcoded school ids: 0" |

What the M3 tests prove, if you want to run one area on its own:

- [ ] `pnpm vitest run tests/finance/paystack.test.ts` : the webhook signature is checked on the exact body; a wrong, missing or altered signature is refused; amounts are whole kobo.
- [ ] `pnpm vitest run tests/finance/online-payments.test.ts tests/finance/online-payment-flow.test.ts` : a payment is recorded only when Paystack confirms it, for the same amount in naira; the same webhook sent twice, even at the same moment, records one payment and one receipt; a wrong amount is held, not recorded; a payment made while the bill changed is kept as credit; a virtual-account transfer lands on the right student; one school's payment cannot land on another's student.
- [ ] `pnpm vitest run tests/finance/payment-routes.test.ts` : a parent can pay only for their own child, never more than is owed, and is limited to 5 starts in 10 minutes.
- [ ] `pnpm vitest run tests/finance/fee-adjustments.test.ts tests/db/net-billing.test.ts` : discounts and sibling discounts lower the bill (a percentage is taken from the full tuition, never compounded); an instalment plan must add up exactly to the bill; the database refuses an overpayment against the net bill.
- [ ] `pnpm vitest run tests/messaging` : numbers become `234XXXXXXXXXX`; a message with a missing fact is refused, never guessed; one event is queued once; opt-outs are respected; WhatsApp falls back to email; failures retry on a schedule and stop after 5 tries; nothing connected leaves messages waiting and uncounted; unknown cost is never counted as free; a delivery report with a bad signature is refused; the scheduled jobs refuse every call when `CRON_SECRET` is not set; an invite works once, expires, and can never take over another person's account.
- [ ] `pnpm vitest run tests/messaging/event-wiring.test.ts` : attendance tells parents of an absent or late child only; no arrival time or session is invented; a notice goes to the right audience and the count comes from the school's records.

## 2. Accounts and keys you need (all optional until you test that part)

Set these in `FRONTEND/.env.local`, then **restart `pnpm dev`** (a running server does not see new values). The list is also in `FRONTEND/.env.example`.

| Variable | What it is | Where to get it |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | Use the **test** key `sk_test_...` first | Paystack dashboard, Settings, API Keys |
| `TERMII_API_KEY`, `TERMII_BASE_URL` | The base URL is the one on your Termii account. There is no default. | Termii dashboard |
| `TERMII_WHATSAPP_DEVICE_ID` | The WhatsApp device Termii gave you | Termii, WhatsApp |
| `TERMII_WEBHOOK_SECRET` | Used to check Termii's delivery reports | **UNVERIFIED**: Termii's docs do not say where the signing key is shown. Until set, every delivery report is refused (the messages are still sent; they just stay "Sent" and never become "Delivered"). |
| `RESEND_API_KEY`, `EMAIL_FROM` | Email | resend.com. **UNVERIFIED** against the live service. |
| `CRON_SECRET` | 16 or more random characters. Make your own. | Any password generator |

- [ ] With none of these set, open http://localhost:3001/proprietor/online-payments and http://localhost:3001/proprietor/messaging-setup. They say plainly that Paystack or the messaging account is not connected. No error, no crash.

## 3. Parent portal pages (no keys needed)

Sign in with the role switcher at http://localhost:3001/login.

- [ ] Parent: http://localhost:3001/parent/fees shows the bill, payments and receipts. With online payment not set up it says: "Online payment is not switched on for this school yet." There is no Pay Online button.
- [ ] Parent: http://localhost:3001/parent/profile has "Messages to My Phone". Untick "Child absent or late"; reload; it stays unticked. Untick "Receive messages from the school": every other box greys out. Tick it again. (Needs the parent's phone to be on their record at the school.)
- [ ] http://localhost:3001/activate/parent (no link) shows "This link cannot be used" with no form.
- [ ] http://localhost:3001/parent/fees/verify (no reference) shows "No payment to check".

## 4. Connect the school's bank account (Paystack test mode)

Needs `PAYSTACK_SECRET_KEY` (test).

- [ ] Proprietor: http://localhost:3001/proprietor/online-payments shows a blue "Paystack is in test mode" notice.
- [ ] The bank list loads in the Bank box (it comes from Paystack).
- [ ] Enter an account name, a bank, and a 10-digit number. **UNVERIFIED:** Paystack's test mode may only accept its own test account numbers; if it refuses, its message is shown to you. Connect Account. It then shows "account ending XXXX". Only the last four digits are stored: check `select settings->'payments' from schools;` holds `subaccountCode` and `accountLast4` and **no** full account number.
- [ ] Turn Off, then reload http://localhost:3001/parent/fees as a parent: no Pay Online button. Turn On: it is back.
- [ ] Change "Who pays Paystack's fee" and confirm it sticks.
- [ ] Bursar and Principal cannot change this: as Bursar, `POST /api/payments/settings` is refused (the screen is proprietor only).

## 5. A parent pays (the main test)

You must make Paystack's webhook reach your machine. Paystack cannot call `localhost`: use a tunnel (for example `ngrok http 3000`) and in the Paystack dashboard, Settings, API Keys and Webhooks, set the **Test Webhook URL** to `https://<your-tunnel>/api/webhooks/paystack`.

- [ ] Give a student a real bill (set JSS tuition in http://localhost:3001/proprietor/settings if it is empty). Sign in as that student's parent.
- [ ] http://localhost:3001/parent/fees now shows **Pay Online** with an empty amount box (nothing pre-filled), "Full balance" and, if there is a plan, "Next instalment".
- [ ] Type an amount **above the balance**: refused with how much is owed. Type **below ₦100** (if the balance is larger): refused.
- [ ] Pay a **part** amount. You are sent to Paystack. Use the test card Paystack publishes on its "Test Payments" documentation page. **Do not use a real card.**
- [ ] You come back to `/parent/fees/verify?reference=...`. It says "Payment received" and shows the receipt number.
- [ ] Bursar: http://localhost:3001/bursar/online-payments lists it as **Received**, matched to the student, with the Paystack fee. **Nothing was typed.** This is the M3 "done when" test.
- [ ] http://localhost:3001/bursar/fees shows the payment and the new balance. The receipt number matches.
- [ ] Pay the rest. The balance reaches ₦0 and the Pay Online box disappears.
- [ ] **Replay:** in the Paystack dashboard, resend the same webhook event. Nothing new appears: still one payment, one receipt.
- [ ] **Closed too soon:** start a payment, pay on Paystack, then close the tab before returning. Within a minute the webhook records it anyway. (Check `/bursar/online-payments`.)
- [ ] **Declined card:** use Paystack's declined test card. The parent sees it did not go through. `/parent/fees` lists it under "Payments Not Completed" with "Check Again". No money recorded.
- [ ] **Abandoned:** start a payment and close Paystack without paying. It shows as waiting or not finished and nothing is recorded.
- [ ] **Mismatch:** hard to cause by hand. It is covered by the automated test; the screen shows a yellow "did not match" banner and the row says "Needs checking".

## 6. Discounts, plans and sibling discounts

Bursar: http://localhost:3001/bursar/adjustments

- [ ] Search a student. The top line shows class tuition, less any discounts, and the amount billed.
- [ ] Add a **scholarship** of 20 percent with a reason. The billed amount drops by 20 percent of the **full** tuition. Add a ₦5,000 **discount** too: the two add up, they do not compound.
- [ ] Leave the reason empty: refused. Give both an amount and a percentage: refused.
- [ ] As that student's parent, http://localhost:3001/parent/fees shows the lower bill and "After ₦X off: <reason>".
- [ ] Switch the scholarship off. The bill goes back up. It stays listed, struck through, with who gave it.
- [ ] **Sibling discount:** for a family with two or more children, set a percentage and Give Discount. The first child (admitted first) pays in full; every later child gets it. Press it again: nothing is given twice.
- [ ] **Instalment plan:** Set Up a Plan, with two or more dates and amounts. Try a total that does not equal the bill: refused, and the screen shows the difference. Save with the right total. As the parent: the plan shows on `/parent/fees`, "Next instalment" appears, and paying it ticks the first instalment off. Remove Plan works.
- [ ] Try to pay more online than the **net** bill allows: refused.
- [ ] **Student bank account number:** press Get Account Number. **UNVERIFIED:** Paystack's dedicated virtual accounts may not be offered to your account; if so you see Paystack's message and the parent can still pay online. If it works, the parent sees "Pay by Bank Transfer", and a transfer to that number is matched to the student with nothing typed. Test it in Paystack test mode before telling any parent about it.

## 7. Messages

In plain words: when something happens to a child, the school's system sends the parent a short message on their phone (WhatsApp first, email if WhatsApp is not possible or there is no phone; there is no SMS). **A parent does not need an account to receive these.** The Messages page is the record of what was sent, to whom, whether it arrived, and what it cost. Messaging Setup holds the technical details (the WhatsApp device and the approved WhatsApp templates) and the fee reminder days; Eductive normally fills in the technical part with you once.

Without Termii connected, the queue still fills, and nothing is sent. That is by design.

- [ ] Bursar records a manual payment for a student at http://localhost:3001/bursar/fees. Then open http://localhost:3001/bursar/messages: a "Payment received" message is waiting for each parent who has a phone or email on record. The message is queued once per receipt, however many times the page is saved or the request is repeated.
- [ ] Parent with **no** phone or email: the message shows "Not sent" with the reason, not an error.
- [ ] Parent who has opted out (section 3): "Not sent", reason opted out.
- [ ] Teacher marks a child **absent** at http://localhost:3001/teacher/attendance: one message queued. Save the register again: still one. Mark **late**: a separate "late" message. Mark **present**: none.
- [ ] If no academic session or term is current, saving attendance is refused with a clear message. It no longer invents one.
- [ ] Gate: security releases a child at http://localhost:3001/security/pickup (or admin http://localhost:3001/admin/pickup): a "Left school" message is queued.
- [ ] Results: the Proprietor releases a class's report cards at http://localhost:3001/proprietor/results: one "Results released" message per child's guardians. **This one and the gate one have no route-level automated test; check them by hand.**
- [ ] Notice: Principal at http://localhost:3001/admin/communications. Choose All Guardians, write a notice, send. The toast says how many messages were queued and how many were not sent. A parent with three children in the audience gets **one** message. Choose a class and send: only that class's parents. The channel tiles show "Not connected yet" until a provider is connected, and turn green when it is.
- [ ] Nothing the school sends contains a score, a fee figure or a name that is not in the school's records.

**With Termii connected** (needs the keys and a WhatsApp device):

- [ ] The scheduler sends queued messages. For testing, call it yourself (replace the secret):

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3001/api/cron/messages
```

- [ ] The message moves to **Sent**, shows its channel, and, once Termii reports it, **Delivered** with a cost. **UNVERIFIED:** the delivery report's signature check depends on `TERMII_WEBHOOK_SECRET`. Register `https://<your-host>/api/webhooks/termii` as the delivery-report URL on Termii.
- [ ] Send a message with the wrong key: it shows **Failed** with the reason, and **Try Again** works.
- [ ] **WhatsApp:** **UNVERIFIED.** WhatsApp lets a school start a conversation only with a template WhatsApp has approved. Fill in the template id and value names for each message at http://localhost:3001/proprietor/messaging-setup. A message with no template goes by email if the parent has one on record, and otherwise is not sent, so every message you want parents to get needs a template. Test each template once on your own phone.
- [ ] Cost on http://localhost:3001/proprietor/messages: "Cost this month" is what Termii reported. Messages with no cost yet are counted in a separate note, never as ₦0.

## 8. Fee reminders

http://localhost:3001/proprietor/messaging-setup

- [ ] Set "Fees fall due on" a few days ahead, days before as `3, 1`, days after as `1, 7`, turn reminders on, Save.
- [ ] Run the daily job:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3001/api/cron/reminders
```

- [ ] Only parents whose child still owes fees get a reminder, for the right amount. Run it again the same day: no new messages. A student on an instalment plan is reminded about the next instalment instead. A parent who opted out of reminders gets none. A paid-up student gets none.
- [ ] Without the secret, or with a wrong one, both URLs refuse. With `CRON_SECRET` unset, both refuse everyone.
- [ ] **Hosting:** `FRONTEND/vercel.json` schedules the message job every 5 minutes and reminders daily at 06:00. **Check your Vercel plan: I believe the free (Hobby) plan allows scheduled jobs only once a day**, which would make messages slow. Confirm this before relying on it. Add `CRON_SECRET` in Vercel; it then sends it automatically.

## 9. Parent activation by invite

Invite Parents: http://localhost:3001/admin/parents (also http://localhost:3001/proprietor/parents)

- [ ] The top shows "N of M" parents activated and a percentage. For a school with no parents it shows a dash, not 0%. M counts only guardians who have a child at the school: on 4 November Oakland showed **8 of 27 (30%)**. (Oakland's database also holds 54 leftover guardian records with no child, and several people appear in more than one record. They are not counted. See section 13.)
- [ ] The "Not activated" list shows each parent with children and a hidden-middle phone number. A parent with no phone and no email has the button disabled and says why.
- [ ] **Send Link to All N Parents** (top right) sends a link to every parent who has a child, no account, no invite still open, and a phone or email. It asks you to confirm, then says how many were queued, how many were not sent, and how many have no phone or email. Pressing it again sends nothing new. **Send Invite** on one row does the same for one parent. With Termii connected the link goes to the parent's phone. With nothing connected the messages wait in the queue (see Messages) and go out when a provider is connected; a parent with no phone or email shows the link once on screen so you can hand it over.
- [ ] Open the link http://localhost:3001/activate/parent?token=... in a private window. It shows the school name and the parent's first name. A weak password (short, or no number) is refused. Choose a good one: "Your account is ready". Sign in at http://localhost:3001/login with that email and password and land on the parent portal with their own children only.
- [ ] Open the same link again: "This link cannot be used".
- [ ] A link older than 7 days, or replaced by a newer invite, is refused.
- [ ] Enter an email that already belongs to someone else's account: refused. It does not take the account over.
- [ ] After activating, the parent row shows "Activated" and the count goes up.
- [ ] The PRD target is half of Oakland's parents activated. This screen is how you track it.

## 10. Security checks

- [ ] `curl -X POST http://localhost:3001/api/webhooks/paystack -d "{}"` is refused (no signature). With no key set it answers that payments are not set up.
- [ ] A webhook with a valid signature for a **reference that does not exist** records nothing.
- [ ] As a parent, open `/api/payments/online` : refused (staff only). As a parent, `/api/payments/verify?reference=` for **another family's** payment: "not found".
- [ ] As a teacher, `/api/messages` and `/api/payments/adjustments` are refused.
- [ ] Two schools: with a second school on a copy of the database, school A's bursar cannot see school B's payments, messages or invites (the automated tests cover this; the database policy is the second layer).
- [ ] `grep -rnE "SAMPLE_|MOCK_|Adeleke|Sarah Williams|88\.4%|2nd of 38|1 score pending|4821" src` prints nothing.

## 11. Mobile and desktop

For each page below, check at 1280 by 800 and at 375 by 812: no sideways scroll, every button and field at least 44 pixels tall, tables scroll inside their box.

Done on 4 November 2026 against Oakland's database after 031, by script and screenshot in the in-app browser: at 375 width these had no sideways scroll and no control under 44 pixels: `/parent/fees` (with the Pay Online box, "Payments Not Completed", instalment plan and bank transfer card shown by feeding the page test data **in the browser only**, nothing written to the database), `/parent/fees/verify`, `/parent/profile`, `/activate/parent` (no valid link), `/bursar/online-payments`, `/bursar/adjustments`, `/bursar/messages`, `/proprietor/online-payments`, `/proprietor/messaging-setup`, `/proprietor/parents`, `/proprietor/messages`, `/admin/parents`, `/admin/messages`, `/admin/communications`. Desktop (1280 wide) was looked at for `/parent/fees`, `/proprietor/online-payments`, `/admin/communications` and `/bursar/adjustments`. Older small controls were raised to 44 pixels on the parent profile (Show, Sign Out), the sign-in header link, and the notices page (template box, subject box, send button).

**Still to do by hand, because they need a real payment, key or parent:** the filled-in states of the online payments table, the messages table with real rows, the Parent Accounts invite result, the instalment editor with a student chosen, and every page at desktop width with real rows.

- [ ] http://localhost:3001/parent/fees
- [ ] http://localhost:3001/parent/fees/verify?reference=anything
- [ ] http://localhost:3001/parent/profile
- [ ] http://localhost:3001/activate/parent?token=anything
- [ ] http://localhost:3001/bursar/online-payments, /bursar/adjustments, /bursar/messages
- [ ] http://localhost:3001/proprietor/online-payments, /proprietor/messages, /proprietor/messaging-setup, /proprietor/parents
- [ ] http://localhost:3001/admin/parents, /admin/messages, /admin/communications

## 12. PRD "done when" for M3

- [ ] A parent pays online and the bursar sees it matched without typing: section 5.
- [ ] At least half of Oakland's parents are activated: the percentage in section 9. This is real work for the school (phone numbers must be on record), not a code check.
- [ ] No payment left unmatched over a term: the "Needs checking" count on `/bursar/online-payments` is 0 at the end of the term, and no payment shows "Received (not on the account yet)".

## 13. Known limits

- Nothing has been tested against live Paystack, Termii or Resend. Treat their first real runs as the real test.
- **UNVERIFIED** assumptions: Paystack dedicated virtual accounts; the exact fields Paystack returns in some responses; Termii's WhatsApp template send and delivery-report signing key; Resend email; Africa's Talking is not built.
- A guardian with no email on record gets a made-up address in the system. It is never treated as a real email: invites ask for a real one, and Paystack receipts to it go nowhere. Collect real parent emails over time.
- **Duplicate guardian records.** Oakland has 81 guardian records for 31 different phone numbers; 54 have no child linked. A parent's portal shows only the children linked to the record their email is on, and one email can be used by only one record, so a parent who appears in two records cannot activate both. Merge the duplicate records before inviting those parents. This is data cleanup, not a code fix, and I have not changed any of it.
- Scheduled notices (send later) are not supported; a notice is sent when you press send.
- A parent with two numbers receives messages on the number on record only.
- "Eductive never holds funds" rests on each school having its own Paystack sub-account. Confirm with Paystack that sub-accounts settle straight to the school's bank under your account's terms.
- WhatsApp costs money per message. The school pays Termii; the cost shown is what Termii reports, not a bill.
