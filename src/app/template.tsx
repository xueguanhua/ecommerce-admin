import ClientApp from '@/components/ClientApp';

export default function Template({ children }: { children: React.ReactNode }) {
  return <ClientApp>{children}</ClientApp>;
}
