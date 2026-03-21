"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    question: "How is a 'request' counted?",
    answer:
      "A request is any incoming tool execution call to your MCP server. Health checks, dashboard traffic, and webhook events are not counted toward your quota.",
  },
  {
    question: "Can I self-host APIFold for free?",
    answer:
      "Yes! The entire stack is open source (AGPL-3.0 + MIT transformer). You can run it on your own infrastructure with Docker Compose — no limits, no fees. The paid plans are for our managed cloud platform.",
  },
  {
    question: "What happens if I exceed my request limits?",
    answer:
      "On the Free plan, requests are hard-capped — you'll receive a 429 response. On Starter and Pro plans, we charge a small overage fee of €0.50 per 10,000 extra requests. We alert you at 80% and 100% of your quota.",
  },
  {
    question: "Do you offer SLA guarantees?",
    answer:
      "Enterprise plans include a 99.99% uptime SLA with financial backing. Pro plans include best-effort priority support with response within 4 business hours.",
  },
  {
    question: "Which AI clients does APIFold support?",
    answer:
      "Any client that speaks the MCP protocol: Claude Desktop, Cursor, Windsurf, Continue, and more. APIFold uses standard SSE (Server-Sent Events) transport, which is part of the MCP specification.",
  },
  {
    question: "Is my API data stored or logged?",
    answer:
      "Request logs (method, path, status, duration) are retained per your plan's log retention period. API credentials are encrypted with AES-256-GCM and are never stored in plaintext. Self-hosters control all data storage.",
  },
  {
    question: "Can I upgrade or downgrade at any time?",
    answer:
      "Yes. Plan changes take effect immediately. When upgrading, you're charged the prorated difference. When downgrading, the remaining credit applies to future invoices.",
  },
] as const;

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {FAQS.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="rounded-xl border border-[#40485d]/30 bg-[#0f1930]/60 transition-colors duration-200 hover:border-[#40485d]/60"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between px-6 py-4 text-left"
              id={`faq-trigger-${index}`}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${index}`}
            >
              <span className="pr-4 text-sm font-medium text-white">
                {faq.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#a3aac4] transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div
              id={`faq-panel-${index}`}
              role="region"
              aria-labelledby={`faq-trigger-${index}`}
              className={`grid transition-all duration-200 ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-4 text-sm leading-relaxed text-[#a3aac4]">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
