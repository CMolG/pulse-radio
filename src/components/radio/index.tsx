/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import dynamic from 'next/dynamic';

const RadioShell = dynamic(() => import('./RadioShell'), { ssr: false });

export default function RadioApp({ isPip }: { isPip?: boolean }) { return <RadioShell isPip={isPip} />; }
