"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import dynamic from 'next/dynamic';
import { I18nProvider } from '../providers/I18nProvider';
import { PrivyProvider } from '@privy-io/react-auth';

const MiniKitProvider = dynamic(
  () => import('../providers/MiniKitProvider').then((mod) => mod.MiniKitProvider),
  { ssr: false }
);

export function Providers(props: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <I18nProvider>
          <MiniKitProvider>
            {props.children}
          </MiniKitProvider>
        </I18nProvider>
    </ThemeProvider>
  );
}
