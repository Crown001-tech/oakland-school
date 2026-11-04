'use client';

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';

type Result = { status: string; outcome: string; reason: string | null; amount: number; receipt: string | null };

// Paystack can take a moment to confirm, so the page asks a few times before it says "still waiting"
const TRIES = 8;
const WAIT_MS = 3000;

function VerifyPayment() {
  const params = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const [result, setResult] = useState<Result | null>(null);
  const [problem, setProblem] = useState('');
  const [checking, setChecking] = useState(Boolean(reference));
  const stopped = useRef(false);

  const check = useCallback(async () => {
    stopped.current = false;
    setChecking(true);
    setProblem('');
    for (let i = 0; i < TRIES && !stopped.current; i++) {
      try {
        const res = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`);
        const data = await res.json();
        if (!data.success) {
          setProblem(data.message || 'Could not check the payment.');
          break;
        }
        setResult(data.data);
        // Done once the answer is final; "not successful" can still turn into a success while Paystack settles
        if (data.data.outcome !== 'not_successful') break;
      } catch {
        setProblem('Could not reach the school. Check your connection and try again.');
        break;
      }
      await new Promise((r) => setTimeout(r, WAIT_MS));
    }
    setChecking(false);
  }, [reference]);

  useEffect(() => {
    if (!reference) return;
    check();
    return () => {
      stopped.current = true;
    };
  }, [reference, check]);

  const received = result?.outcome === 'recorded' || result?.outcome === 'already_recorded';
  const held = result?.outcome === 'mismatch';

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 text-center space-y-4">
      {!reference ? (
        <>
          <AlertCircle className="w-10 h-10 mx-auto text-rose-600" />
          <h1 className="text-lg font-bold text-slate-900">No payment to check</h1>
          <p className="text-xs text-slate-600">Open this page from the link Paystack sends you after paying, or start again from Fees.</p>
        </>
      ) : checking && !result ? (
        <BrandLoader size="lg" />
      ) : received ? (
        <>
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
          <h1 className="text-lg font-bold text-slate-900">Payment received</h1>
          <p className="text-xs text-slate-600">
            ₦{Number(result!.amount).toLocaleString()} has been recorded.
            {result!.receipt ? ` Your receipt number is ${result!.receipt}.` : ''}
          </p>
        </>
      ) : held ? (
        <>
          <AlertCircle className="w-12 h-12 mx-auto text-amber-600" />
          <h1 className="text-lg font-bold text-slate-900">The bursar will check this payment</h1>
          <p className="text-xs text-slate-600">The amount Paystack received did not match what was asked for, so it has not been recorded yet. You do not need to pay again. The school will contact you.</p>
        </>
      ) : problem ? (
        <>
          <AlertCircle className="w-12 h-12 mx-auto text-rose-600" />
          <h1 className="text-lg font-bold text-slate-900">Could not check the payment</h1>
          <p role="alert" className="text-xs text-slate-600">{problem}</p>
        </>
      ) : (
        <>
          <Clock className="w-12 h-12 mx-auto text-slate-400" />
          <h1 className="text-lg font-bold text-slate-900">{checking ? 'Waiting for Paystack' : 'Not confirmed yet'}</h1>
          <p className="text-xs text-slate-600">
            {result?.reason || 'Paystack has not confirmed this payment.'} If you were charged, it will be recorded as soon as Paystack confirms it. You will not be charged twice.
          </p>
        </>
      )}

      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
        {reference && !checking && !received && !held ? (
          <button type="button" onClick={check} className="min-h-[44px] px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer">
            Check Again
          </button>
        ) : null}
        <Link href="/parent/fees" className="min-h-[44px] px-5 inline-flex items-center justify-center rounded-xl bg-brand-primary hover:bg-brand-primary-light text-white text-xs font-bold">
          Back to Fees
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPaymentPage() {
  return (
    <Suspense fallback={<BrandLoader size="lg" />}>
      <VerifyPayment />
    </Suspense>
  );
}
