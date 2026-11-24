import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

type FundForm = {
  name: string;
  email: string;
  business: string;
  location: string;
  website: string;
  fundingRoute: "sales_linked" | "client_programme_budget";
  products: string;
  amountPerSale: string;
  desiredCreativeWork: string;
  notes: string;
};

const initialForm: FundForm = {
  name: "",
  email: "",
  business: "",
  location: "",
  website: "",
  fundingRoute: "sales_linked",
  products: "",
  amountPerSale: "",
  desiredCreativeWork: "",
  notes: "",
};

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder,
  type = "text",
}: {
  label: string;
  name: keyof FundForm;
  value: string;
  onChange: (name: keyof FundForm, value: string) => void;
  required?: boolean;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">
        {label}{required ? " *" : ""}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        className="w-full border-2 border-black bg-[#F9F9F6] px-4 py-3 font-mono text-sm outline-none placeholder:text-black/30 focus:bg-[#c6ff3d]"
      />
    </label>
  );
}

function TextArea({
  label,
  name,
  value,
  onChange,
  required = false,
  placeholder,
}: {
  label: string;
  name: keyof FundForm;
  value: string;
  onChange: (name: keyof FundForm, value: string) => void;
  required?: boolean;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">
        {label}{required ? " *" : ""}
      </span>
      <textarea
        name={name}
        required={required}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full resize-y border-2 border-black bg-[#F9F9F6] px-4 py-3 font-mono text-sm leading-relaxed outline-none placeholder:text-black/30 focus:bg-[#c6ff3d]"
      />
    </label>
  );
}

export function FundApplicationForm({ analyticsRoute = "fund" }: { analyticsRoute?: string }) {
  const [form, setForm] = useState<FundForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const isSalesLinked = form.fundingRoute === "sales_linked";

  const updateField = (name: keyof FundForm, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    trackEvent("fund_application_attempted", { route: analyticsRoute, fundingRoute: form.fundingRoute });
    setStatus("sending");

    try {
      const response = await fetch("/api/fund/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error("application failed");
      trackEvent("fund_application_submitted", { route: analyticsRoute, fundingRoute: form.fundingRoute });
      setForm(initialForm);
      setStatus("sent");
    } catch {
      trackEvent("fund_application_failed", { route: analyticsRoute, fundingRoute: form.fundingRoute, reason: "request_error" });
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="border-2 border-black bg-white p-5 sm:p-8">
      <p className="mb-6 text-sm leading-relaxed text-black/65">A few details are enough to start. Choose the route that fits. If you are still working out the contribution or programme budget, write “to discuss”.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="your name" name="name" value={form.name} onChange={updateField} required placeholder="your name" />
        <Field label="your email" name="email" value={form.email} onChange={updateField} required type="email" placeholder="you@yourbusiness.com" />
        <Field label="business or organisation" name="business" value={form.business} onChange={updateField} required placeholder="business, brand or institution" />
        <Field label="where are you based?" name="location" value={form.location} onChange={updateField} required placeholder="city + country" />
        <Field label="website or social" name="website" value={form.website} onChange={updateField} placeholder="optional link" />
        <Field
          label={isSalesLinked ? "what contribution per sale could work?" : "what programme budget could work?"}
          name="amountPerSale"
          value={form.amountPerSale}
          onChange={updateField}
          required
          placeholder={isSalesLinked ? "e.g. €0.50 per sale, 2% of selected revenue, or “to discuss”" : "a total budget, range, or “to discuss”"}
        />
      </div>
      <div className="mt-5 grid gap-5">
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">how would you like to build the Fund?</legend>
          <label className={`flex min-h-16 cursor-pointer items-center gap-3 border-2 border-black px-4 py-3 text-sm font-bold uppercase ${isSalesLinked ? "bg-[#c6ff3d]" : "bg-[#F9F9F6]"}`}>
            <input type="radio" name="fundingRoute" value="sales_linked" checked={isSalesLinked} onChange={(event) => updateField("fundingRoute", event.target.value as FundForm["fundingRoute"])} className="accent-black" />
            <span>Culture Euro from selected sales</span>
          </label>
          <label className={`flex min-h-16 cursor-pointer items-center gap-3 border-2 border-black px-4 py-3 text-sm font-bold uppercase ${!isSalesLinked ? "bg-[#c6ff3d]" : "bg-[#F9F9F6]"}`}>
            <input type="radio" name="fundingRoute" value="client_programme_budget" checked={!isSalesLinked} onChange={(event) => updateField("fundingRoute", event.target.value as FundForm["fundingRoute"])} className="accent-black" />
            <span>Client or brand programme budget</span>
          </label>
        </fieldset>
        <TextArea
          label={isSalesLinked ? "which sales should build the Fund?" : "what local programme should the budget support?"}
          name="products"
          value={form.products}
          onChange={updateField}
          required
          placeholder={isSalesLinked ? "room nights, selected menu or product sales, event tickets, membership revenue..." : "a local commission, artist-led experience, community programme or residency"}
        />
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">what should the Fund make possible?</legend>
          <label className={`flex min-h-14 cursor-pointer items-center gap-3 border-2 border-black px-4 py-3 text-sm font-bold uppercase ${form.desiredCreativeWork === "marketing_creative_delivery" ? "bg-[#c6ff3d]" : "bg-[#F9F9F6]"}`}>
            <input type="radio" name="desiredCreativeWork" value="marketing_creative_delivery" checked={form.desiredCreativeWork === "marketing_creative_delivery"} onChange={(event) => updateField("desiredCreativeWork", event.target.value)} className="accent-black" />
            Marketing + Creative Delivery
          </label>
          <label className={`flex min-h-14 cursor-pointer items-center gap-3 border-2 border-black px-4 py-3 text-sm font-bold uppercase ${form.desiredCreativeWork === "community_programmes_residencies" ? "bg-[#c6ff3d]" : "bg-[#F9F9F6]"}`}>
            <input type="radio" name="desiredCreativeWork" value="community_programmes_residencies" checked={form.desiredCreativeWork === "community_programmes_residencies"} onChange={(event) => updateField("desiredCreativeWork", event.target.value)} className="accent-black" />
            Community Programmes + Residencies
          </label>
        </fieldset>
        <TextArea label="what should the work involve?" name="notes" value={form.notes} onChange={updateField} placeholder="campaign, artist-led workshop, mentoring, community programme or residency" />
      </div>

      {status === "sent" ? (
        <div className="mt-7 border-2 border-black bg-[#c6ff3d] p-5">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          <p className="mt-4 text-lg font-black uppercase leading-none">got it.</p>
          <p className="mt-3 text-sm leading-relaxed text-black/70">Thanks. Countercult will review the funding route and work you shared, then reply with a practical next step.</p>
        </div>
      ) : (
        <>
          {status === "error" && (
            <p className="mt-5 border-2 border-black bg-[#ffb3b3] p-4 text-sm leading-relaxed">we couldn’t send that just now. please try again or email countercultplatform@gmail.com.</p>
          )}
          <button type="submit" disabled={status === "sending"} className="mt-7 inline-flex items-center gap-3 border-2 border-black bg-black px-6 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#c6ff3d] transition-colors hover:bg-[#c6ff3d] hover:text-black disabled:cursor-wait disabled:opacity-60">
            <Send className="h-4 w-4" aria-hidden="true" /> {status === "sending" ? "sending..." : "send a Fund enquiry"}
          </button>
        </>
      )}
    </form>
  );
}