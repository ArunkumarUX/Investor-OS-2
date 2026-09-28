"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageCircle, SquarePen, X } from "lucide-react";
import styles from "@/app/diligence/report.module.css";

const PROMPTS = [
  "What does the file say about revenue?",
  "What is still unverified?",
  "Where do the claims contradict?",
];

export default function ReportChat({
  companyName,
  open,
  messages,
  onOpen,
  onClose,
  onReset,
  onSend,
}: {
  companyName: string;
  open: boolean;
  messages: { role: "user" | "assistant"; text: string }[];
  onOpen: () => void;
  onClose: () => void;
  onReset: () => void;
  onSend: (question: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = body.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setDraft("");
    onSend(question);
  }

  return (
    <>
      <button type="button" className={styles.chatFab} data-open={open ? "true" : "false"} onClick={() => (open ? onClose() : onOpen())} aria-label={open ? "Close ask" : "Ask"}>
        {open ? <X size={20} /> : <><MessageCircle size={18} aria-hidden="true" />Ask</>}
      </button>
      {open && (
        <section className={styles.chatPanel} aria-label="Ask this report">
          <header className={styles.chatHead}>
            <div>
              <strong>Ask this report</strong>
              <span>{companyName} · answers stay inside the company file</span>
            </div>
            <button type="button" onClick={onReset} aria-label="New chat"><SquarePen size={16} /></button>
            <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </header>
          <div className={styles.chatBody} ref={body}>
            {messages.length === 0 ? (
              <>
                <p className={styles.chatLead}>Ask about a claim, a source, or a gap. The reply uses this report only.</p>
                {PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" className={styles.chatPrompt} onClick={() => onSend(prompt)}>{prompt}</button>
                ))}
              </>
            ) : (
              messages.map((message, index) => (
                <p key={`${message.role}-${index}`} className={message.role === "user" ? styles.chatUser : styles.chatBot}>{message.text}</p>
              ))
            )}
          </div>
          <form className={styles.chatForm} onSubmit={submit}>
            <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about a claim…" aria-label="Ask about a claim" />
            <button type="submit" aria-label="Send"><ArrowUp size={16} /></button>
          </form>
        </section>
      )}
    </>
  );
}
