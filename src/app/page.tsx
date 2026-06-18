'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  React.useEffect(() => {
    // Check if token exists
    const token = localStorage.getItem('access_token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center text-zinc-500 font-sans">
      <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
      <span>Redirecting you to study desk...</span>
    </div>
  );
}
