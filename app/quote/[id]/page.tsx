import { QuoteEditor } from '@/components/QuoteEditor';

interface QuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotePage({ params }: QuotePageProps) {
  const { id } = await params;
  return <QuoteEditor quoteId={id} />;
}
