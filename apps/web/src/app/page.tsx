'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Coffee,
  TrendingUp,
  Layers,
  Users,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('phela_token');
      if (!token) {
        router.push('/login');
      } else {
        const active = api.getCurrentUser();
        if (active && active.Role === 'STAFF') {
          router.push('/pos');
        } else {
          setIsAuthenticated(true);
        }
      }
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-gradient-to-b from-primary-phela-clay/10 to-transparent blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-gradient-to-t from-primary-phela-gold/5 to-transparent blur-[160px] rounded-full" />

      {/* Header bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-phela-clay to-primary-phela-gold flex items-center justify-center shadow-lg shadow-primary-phela-clay/20">
              <Coffee className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-outfit font-bold text-xl tracking-wide uppercase bg-gradient-to-r from-primary-phela-gold to-orange-200 bg-clip-text text-transparent">
                Phêla
              </span>
              <span className="text-[10px] block text-muted-foreground tracking-widest uppercase">
                Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              API Online
            </div>

            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-semibold text-primary-phela-gold">
              AD
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 container max-w-7xl mx-auto px-6 py-12 flex flex-col justify-center">
        {/* Welcome Section */}
        <section className="mb-12 text-center md:text-left max-w-3xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-phela-clay/20 border border-primary-phela-clay/30 text-primary-phela-gold text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Shop Management System v1.0.0
          </div>
          <h1 className="font-outfit font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-none mb-6">
            Crafting premium <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary-phela-gold via-amber-200 to-white bg-clip-text text-transparent">
              milk tea operations
            </span>
          </h1>
          <p className="text-muted-foreground text-lg sm:text-xl font-light leading-relaxed">
            Welcome to the Phêla Administration portal. Manage point of sales, inventories, staff
            schedules, and track live earnings across all premium locations.
          </p>
        </section>

        {/* Action Dashboard Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 animate-fade-in delay-100">
          {/* Card 1 - POS */}
          <Link
            href="/pos"
            className="group relative rounded-2xl border border-border bg-card/50 p-6 shadow-xl transition-all duration-300 hover:border-primary-phela-gold/50 hover:bg-card/80 hover:-translate-y-1 block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-phela-clay/30 border border-primary-phela-clay/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Coffee className="w-6 h-6 text-primary-phela-gold" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-foreground">POS Register</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Create orders, apply discount vouchers, configure hand-shaking options, and process
              payments instantly.
            </p>
            <div className="flex items-center text-xs font-semibold text-primary-phela-gold group-hover:gap-1.5 transition-all">
              Launch POS Terminal <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2 - Inventory */}
          <Link
            href="/menu/drinks"
            className="group relative rounded-2xl border border-border bg-card/50 p-6 shadow-xl transition-all duration-300 hover:border-primary-phela-gold/50 hover:bg-card/80 hover:-translate-y-1 block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-phela-clay/30 border border-primary-phela-clay/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6 text-primary-phela-gold" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-foreground">Recipe & Products</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Manage artisanal ingredients, set product pricing structure, and track real-time stock
              levels of Oolong teas.
            </p>
            <div className="flex items-center text-xs font-semibold text-primary-phela-gold group-hover:gap-1.5 transition-all">
              Manage Catalog <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3 - Analytics */}
          <Link
            href="/analytics"
            className="group relative rounded-2xl border border-border bg-card/50 p-6 shadow-xl transition-all duration-300 hover:border-primary-phela-gold/50 hover:bg-card/80 hover:-translate-y-1 block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-phela-clay/30 border border-primary-phela-clay/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-6 h-6 text-primary-phela-gold" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-foreground">Live Insights</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Track active daily revenue, cup counts, popular variations, and review comprehensive
              store performance.
            </p>
            <div className="flex items-center text-xs font-semibold text-primary-phela-gold group-hover:gap-1.5 transition-all">
              View Analytics <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 4 - Staff */}
          <Link
            href="/shift-logs"
            className="group relative rounded-2xl border border-border bg-card/50 p-6 shadow-xl transition-all duration-300 hover:border-primary-phela-gold/50 hover:bg-card/80 hover:-translate-y-1 block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-phela-clay/30 border border-primary-phela-clay/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-primary-phela-gold" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-foreground">Staff & Rota</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Track attendance, manage shifts schedules, assign barista roles, and oversee
              performance metrics.
            </p>
            <div className="flex items-center text-xs font-semibold text-primary-phela-gold group-hover:gap-1.5 transition-all">
              Staff Portal <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 5 - Settings */}
          <Link
            href="/menu/drink-sizes"
            className="group relative rounded-2xl border border-border bg-card/50 p-6 shadow-xl transition-all duration-300 hover:border-primary-phela-gold/50 hover:bg-card/80 hover:-translate-y-1 block cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary-phela-clay/30 border border-primary-phela-clay/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Settings2 className="w-6 h-6 text-primary-phela-gold" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2 text-foreground">Store Configuration</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Define VAT rates, location parameters, receipt formatting styles, and general POS
              terminal preferences.
            </p>
            <div className="flex items-center text-xs font-semibold text-primary-phela-gold group-hover:gap-1.5 transition-all">
              Modify Settings <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 6 - System Health & Security */}
          <div className="group relative rounded-2xl border border-dashed border-border bg-zinc-900/20 p-6 shadow-md transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-outfit font-bold text-lg mb-2">System Diagnostics</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Production monorepo is fully scaffolded. Environment bindings, databases, routes, and
              client layers are verified.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-800 text-[10px] uppercase tracking-wider text-emerald-400 font-semibold border border-zinc-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Core System Standby
            </div>
          </div>
        </section>

        {/* Footer info */}
        <footer className="border-t border-border/60 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground gap-4">
          <p>© 2026 Phêla Việt Nam. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary-phela-gold transition-colors">
              Documentation
            </a>
            <a href="#" className="hover:text-primary-phela-gold transition-colors">
              Security
            </a>
            <a href="#" className="hover:text-primary-phela-gold transition-colors">
              Support Portal
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
