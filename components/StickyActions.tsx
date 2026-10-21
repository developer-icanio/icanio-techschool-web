import Link from "next/link";
import { SITE } from "@/lib/site";

const WaIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3Z" />
  </svg>
);

// Desktop: floating WhatsApp button. Mobile: a bottom action bar so the
// next step (apply, call, chat) is always one tap away.
export default function StickyActions() {
  const wa = `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(SITE.whatsapp.greeting)}`;
  return (
    <>
      <a href={wa} target="_blank" rel="noopener" aria-label="Chat with Icanio Tech School on WhatsApp" className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105 lg:grid">
        <WaIcon />
      </a>
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-line bg-white/95 p-2.5 backdrop-blur lg:hidden">
        <Link href="/apply-for-internship" className="btn btn-primary !py-2.5">Apply Now</Link>
        <a href={`tel:${SITE.telephone}`} className="btn btn-outline !px-3.5 !py-2.5" aria-label="Call Icanio Tech School">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" /></svg>
        </a>
        <a href={wa} target="_blank" rel="noopener" className="btn !border-2 !border-[#25D366] !bg-[#25D366] !px-3.5 !py-2.5 text-white" aria-label="Chat on WhatsApp"><WaIcon /></a>
      </div>
      <div aria-hidden className="h-16 lg:hidden" />
    </>
  );
}
