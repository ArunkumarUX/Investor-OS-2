"use client";

import Link from "next/link";
import { Download, Play, Share2 } from "lucide-react";
import { downloadText } from "@/lib/export";
import styles from "@/app/company/company.module.css";

export default function OverviewActions({ id, file }: { id: string; file: string }) {
  return (
    <div className={styles.bar}>
      <button type="button" onClick={() => void navigator.clipboard.writeText(window.location.href)}><Share2 size={14} aria-hidden="true" />Share</button>
      <button type="button" onClick={() => downloadText(`${id}-overview.txt`, file)}><Download size={14} aria-hidden="true" />Export PDF</button>
      <Link className={styles.start} href={`/diligence/${id}?play=1`} title="Plays the walkthrough. It does not save a review."><Play size={14} aria-hidden="true" />Preview diligence</Link>
    </div>
  );
}
