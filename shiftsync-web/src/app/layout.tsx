import type { Metadata } from 'next';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ReactQueryProvider } from '@/lib/tanstack-query/ReactQueryProvider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'ShiftSync',
  description: 'Shift scheduling and workforce management',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn('font-sans', fontSans.variable)}>
      <body className="min-h-screen bg-background text-foreground">
      <TooltipProvider>
        <ReactQueryProvider>{children}</ReactQueryProvider>
        <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}


