// Old clients and radio queue refreshes use the same public pool as Explore.
// Original work IDs, moderation/lifecycle restrictions, and the 3-month window
// are enforced by the canonical reader; this alias performs no mutations.
export { GET } from "@/app/api/ai-music/tracks/route";
