'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export function SafeEmailLink({
  user,
  domain,
  className,
  children,
}: {
  user: string;
  domain: string;
  className?: string;
  children?: ReactNode;
}) {
  const [href, setHref] = useState('/contact');
  const [label, setLabel] = useState('Email us');

  useEffect(() => {
    const email = `${user}@${domain}`;
    setHref(`mailto:${email}`);
    setLabel(email);
  }, [user, domain]);

  return (
    <a href={href} className={className} rel="nofollow">
      {children || label}
    </a>
  );
}
