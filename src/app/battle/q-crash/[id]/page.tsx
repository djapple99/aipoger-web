import QCrashCardClient from "@/components/q-crash-card-client";

type QCrashCardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function QCrashCardPage({ params }: QCrashCardPageProps) {
  const { id } = await params;
  return <QCrashCardClient identifier={id} />;
}
