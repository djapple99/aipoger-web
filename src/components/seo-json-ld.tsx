import "server-only";

type SeoJsonLdProps = {
  data: unknown;
};

export default function SeoJsonLd({ data }: SeoJsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
