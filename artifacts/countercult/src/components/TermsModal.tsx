import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function TermsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("cc:open-terms", handler);
    return () => window.removeEventListener("cc:open-terms", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-black text-white border-2 border-[#c6ff3d] font-mono lowercase p-0">
        <DialogTitle className="sr-only">terms & privacy</DialogTitle>
          <DialogDescription className="sr-only">
            Countercult's community notice, liability disclaimer, contact details, and data privacy policy.
          </DialogDescription>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-black border-b border-white/10 px-6 py-4 flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 mb-1">community notice & contact</p>
            <h2 className="font-black text-lg uppercase tracking-tight leading-none text-[#c6ff3d]">countercult</h2>
          </div>
          <DialogClose
            className="shrink-0 text-[11px] uppercase tracking-widest font-bold text-white/60 hover:text-[#c6ff3d] focus:outline-none focus:ring-2 focus:ring-[#c6ff3d] focus:ring-offset-2 focus:ring-offset-black"
          >
            close ×
            <span className="sr-only">Terms and privacy</span>
          </DialogClose>
        </div>

        <div className="px-6 py-6 flex flex-col gap-8">

          <section>
            <p className="text-sm leading-relaxed text-white/70">
              countercult is an independent cultural network and notice board. it helps artists, spaces, and members discover one another; it does not provide housing, brokerage, booking, or emergency services.
            </p>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-white/30 mb-3 border-b border-white/10 pb-2">contact</h3>
            <div className="text-sm leading-relaxed text-white/70 flex flex-col gap-1">
              <p>
                email:{" "}
                <a href="mailto:countercultplatform@gmail.com" className="underline underline-offset-2 hover:text-[#c6ff3d] transition-colors">
                  countercultplatform@gmail.com
                </a>
              </p>
              <p>
                instagram:{" "}
                <a href="https://www.instagram.com/countercult_creatives/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#c6ff3d] transition-colors">
                  @countercult_creatives
                </a>
              </p>
              <p>
                web:{" "}
                <a href="https://countercultcreatives.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#c6ff3d] transition-colors">
                  countercultcreatives.com
                </a>
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-white/30 mb-3 border-b border-white/10 pb-2">disclaimer & liability</h3>
            <div className="text-sm leading-relaxed text-white/50 flex flex-col gap-3">
              <p>
                <span className="font-bold text-white">1. community listings:</span>{" "}
                the data displayed on this map is crowdsourced and submitted entirely by users. countercult does not vet, endorse, or verify the accuracy or legality of any user-submitted pins, voices, or external website links.
              </p>
              <p>
                <span className="font-bold text-white">2. spaces + opportunities:</span>{" "}
                countercult does not own, operate, book, broker, manage, insure, or guarantee any listed space or housing arrangement. it is not a housing provider, guarantor, emergency service, or party to agreements between members. users are responsible for checking identity, permission to offer the space, local rules, written terms, price, insurance, and safety before proceeding.
              </p>
              <p>
                if someone behaves abusively, fraudulently, dangerously, or otherwise does someone dirty, report it to{" "}
                <a href="mailto:countercultplatform@gmail.com?subject=Exchange safety report" className="underline underline-offset-2 hover:text-[#c6ff3d] transition-colors">
                  countercultplatform@gmail.com
                </a>
                . we cannot guarantee physical safety or investigate every dispute. confirmed serious misconduct may result in permanent removal from the network, with reinstatement only if we made a clear factual error.
              </p>
              <p>
                to the fullest extent permitted by applicable law, countercult is not responsible for user-submitted content or arrangements between members. nothing in these terms excludes liability that cannot legally be excluded.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-white/30 mb-3 border-b border-white/10 pb-2">data privacy</h3>
            <div className="text-sm leading-relaxed text-white/50 flex flex-col gap-3">
              <p>
                we take data privacy seriously. by submitting an entry to this map, you are publishing your cultural listing and details to a shared community archive. housing and member offer details are intended for the signed-in member layer.
              </p>
              <p>
                <span className="font-bold text-white">1. data usage:</span>{" "}
                the personal data we collect (such as your contact email) is used to operate, verify, and maintain your listing.
              </p>
              <p>
                <span className="font-bold text-white">2. future platform operations & partnerships:</span>{" "}
                to support research, foster partnerships, and build future cultural products, countercult may use, share, or license aggregated, anonymized, or publicly submitted listing data. we do not sell raw personal contact data (such as your private account email address) to third parties for direct marketing without your explicit consent.
              </p>
              <p>
                <span className="font-bold text-white">3. your rights:</span>{" "}
                you retain the right to access, correct, or request the permanent deletion of your submitted data at any time by contacting us at{" "}
                <a href="mailto:countercultplatform@gmail.com" className="underline underline-offset-2 hover:text-[#c6ff3d] transition-colors">
                  countercultplatform@gmail.com
                </a>
              </p>
            </div>
          </section>

        </div>
      </DialogContent>
    </Dialog>
  );
}

export function openTermsModal() {
  window.dispatchEvent(new CustomEvent("cc:open-terms"));
}
