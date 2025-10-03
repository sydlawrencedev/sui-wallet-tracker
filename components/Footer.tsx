'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function Footer() {
    const pathname = usePathname();



    return (
        <div className='footer'>
            <p>Live prices may be delayed by up to 5 minutes. These figures are illustrative only, based on hypothetical assumptions. Capital is at risk. Investors may lose all or part of their investment.
                Past performance is not a reliable indicator of future results.
                Investments in unlisted securities are illiquid and may be difficult to realise.
                Only professional investors, certified high net worth individuals or self-certified sophisticated investors should consider investing in AT3000i.
            </p>
        </div>
    );
}
