"use client";
import { Suspense } from "react";
import BattleLinkSubmission from "@/components/battle-link-submission";
export default function BattleSubmissionPage() { return <Suspense fallback={<p className="p-6 text-zinc-400">AIPOGER…</p>}><BattleLinkSubmission mode="q_crash" /></Suspense>; }
