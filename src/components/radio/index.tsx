'use client';

import dynamic from 'next/dynamic';

const RadioShell = dynamic(() => import('./RadioShell'), { ssr: false });

export default function RadioApp({ isPip }: { isPip?: boolean }) { return <RadioShell isPip={isPip} />; }
