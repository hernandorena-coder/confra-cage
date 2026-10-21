"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const ativo = pathname === href;
  return (
    <Link href={href} className={ativo ? "on" : undefined}>
      {children}
    </Link>
  );
}
