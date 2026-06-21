"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserPayments } from "@/services/subscriptionService";
import { Button } from "@/components/ui/button";
import { 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  Heart,
  FileText
} from "lucide-react";

function InvoiceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const paymentId = searchParams.get("payment_id");

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPayment() {
      if (!user || !paymentId) return;
      try {
        setLoading(true);
        const paymentsList = await getUserPayments(user.id);
        const found = paymentsList.find(p => p.stripe_invoice_id === paymentId || p.id === paymentId);
        setPayment(found || null);
      } catch (err) {
        console.error("Failed to load invoice details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPayment();
  }, [user, paymentId]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const getPlanName = (p) => {
    if (!p) return "Fundora Subscription";
    const amt = parseFloat(p.amount);
    const priceId = p.stripe_price_id || "";
    
    if (priceId.includes("scout") || amt === 10 || amt === 96) return "Eco Scout Plan";
    if (priceId.includes("advocate") || amt === 25 || amt === 240) return "Global Advocate Plan";
    if (priceId.includes("builder") || amt === 100 || amt === 960) return "Legacy Builder Plan";
    return "Fundora Support Plan";
  };

  const getBillingCycle = (p) => {
    if (!p) return "Monthly";
    const priceId = p.stripe_price_id || "";
    const amt = parseFloat(p.amount);
    if (priceId.includes("yearly") || amt === 96 || amt === 240 || amt === 960) return "Yearly";
    return "Monthly";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-800 flex items-center justify-center text-xs animate-pulse font-sans">
        Loading printable receipt...
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen bg-white text-slate-800 flex flex-col items-center justify-center p-6 text-center font-sans gap-4">
        <XIcon className="w-8 h-8 text-red-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Receipt Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            We could not retrieve the transaction details for the ID provided.
          </p>
        </div>
        <Button onClick={() => router.back()} size="sm" variant="outline" className="mt-2 text-xs">
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans py-8 px-4 flex flex-col items-center">
      
      {/* Printable Control Box (Hidden during print) */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6 print:hidden">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return
        </button>
        <Button 
          onClick={handlePrint}
          variant="outline" 
          size="sm" 
          className="text-xs gap-1.5 font-semibold text-slate-700 hover:text-slate-900"
        >
          <Printer className="w-3.5 h-3.5" /> Print Receipt
        </Button>
      </div>

      {/* Main Invoice Card */}
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl p-8 md:p-12 shadow-sm print:border-none print:shadow-none print:p-0 print:bg-transparent">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                F
              </div>
              <span className="font-bold tracking-wider text-slate-900 text-sm">
                FUNDORA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Fundora Global Giving Foundation<br />
              100 audited pathways, Inc.<br />
              San Francisco, CA 94103
            </p>
          </div>
          
          <div className="sm:text-right">
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold uppercase tracking-wider px-2.5 py-1 rounded-full inline-block mb-3">
              Payment Completed
            </span>
            <h2 className="text-slate-900 text-xl font-extrabold tracking-tight">
              Receipt / Invoice
            </h2>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Invoice #{payment.stripe_invoice_id?.substring(0, 16) || payment.id.substring(0, 12)}
            </p>
          </div>
        </div>

        {/* Info Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10 text-xs">
          <div>
            <h4 className="font-bold text-slate-950 uppercase tracking-wider text-[9px] text-slate-400 mb-2">
              Billed To
            </h4>
            <p className="font-bold text-slate-900">
              {user.user_metadata?.full_name || "Fundora Member"}
            </p>
            <p className="text-slate-500 mt-1 font-medium">
              {user.email}
            </p>
          </div>
          
          <div className="sm:text-right">
            <h4 className="font-bold text-slate-950 uppercase tracking-wider text-[9px] text-slate-400 mb-2">
              Payment Details
            </h4>
            <p className="text-slate-500 font-medium">
              Transaction Date: <strong className="text-slate-900 font-semibold">{new Date(payment.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</strong>
            </p>
            <p className="text-slate-500 mt-1 font-medium">
              Gateway: <strong className="text-slate-900 font-semibold">Stripe (Simulated)</strong>
            </p>
          </div>
        </div>

        {/* Invoice Item Table */}
        <div className="border border-slate-100 rounded-xl overflow-hidden mb-10 text-xs font-medium">
          <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-100 text-[9px] font-bold uppercase tracking-wider text-slate-400 py-3 px-4">
            <div className="col-span-8">Description</div>
            <div className="col-span-2 text-right">Cycle</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          
          <div className="grid grid-cols-12 py-4 px-4 text-slate-900 border-b border-slate-100">
            <div className="col-span-8">
              <span className="font-bold text-slate-950 block">{getPlanName(payment)}</span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">100% tax-deductible charitable route program</span>
            </div>
            <div className="col-span-2 text-right self-center text-slate-500">
              {getBillingCycle(payment)}
            </div>
            <div className="col-span-2 text-right self-center font-bold font-mono">
              ${parseFloat(payment.amount).toFixed(2)}
            </div>
          </div>

          <div className="bg-slate-50/50 py-3 px-4 space-y-1.5 text-right font-medium">
            <div className="flex justify-end gap-12 text-slate-400">
              <span>Subtotal:</span>
              <span className="text-slate-700 font-mono">${parseFloat(payment.amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-end gap-12 text-slate-400">
              <span>Sales Tax (0.0%):</span>
              <span className="text-slate-700 font-mono">$0.00</span>
            </div>
            <div className="flex justify-end gap-12 text-sm font-bold text-slate-950 border-t border-slate-100 pt-2.5 mt-1.5">
              <span>Total Paid:</span>
              <span className="text-emerald-700 font-mono">${parseFloat(payment.amount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-50/40 border border-emerald-100/35 rounded-xl p-4 mb-8 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Audited & verified transaction.</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <Heart className="w-3.5 h-3.5 fill-emerald-600/10" /> Tax Deductible Receipt
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-6">
          Thank you for choosing Fundora. Your contributions directly fund forests, clean water reservoirs, and girl's STEM programs. For duplicate receipt inquiries, contact us at billing@fundora.org.
        </div>
      </div>
    </div>
  );
}

// Fallback visual component
function XIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export default function InvoicePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white text-slate-800 flex items-center justify-center text-xs animate-pulse">
        Generating invoice for printing...
      </div>
    }>
      <InvoiceContent />
    </Suspense>
  );
}
