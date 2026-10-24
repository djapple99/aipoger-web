export const preferredRegion = "hnd1";
import RankClient from "./rank-client";
import { readPublicChoices } from "@/lib/server-public-choice";
export default async function RankPage() {
  return <RankClient initialData={await readPublicChoices()} />;
}
