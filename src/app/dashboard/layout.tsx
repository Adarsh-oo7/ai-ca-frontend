'use client';

import React from 'react';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col light-theme:bg-zinc-50 relative overflow-x-hidden">
      {/* Desktop Sidebar (visible on md and up) */}
      <Sidebar />

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            {/* Slide Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-64 z-50 md:hidden"
            >
              <Sidebar onClose={() => setMobileMenuOpen(false)} isMobile={true} />
              
              {/* Overlay close button */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-5 right-[-50px] p-2 bg-zinc-900 border border-zinc-800 text-white rounded-xl cursor-pointer"
                title="Close Menu"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Fixed Header */}
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        
        {/* Children content wrapper */}
        <main className="flex-1 p-4 md:p-8 ml-0 md:ml-64 w-full md:w-[calc(100%-16rem)] overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
