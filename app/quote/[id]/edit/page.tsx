import { QuoteEditor } from '@/components/QuoteEditor';

interface EditQuotePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id } = await params;
  return <QuoteEditor quoteId={id} />;
}
