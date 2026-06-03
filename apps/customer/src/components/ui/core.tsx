'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// ==========================================
// 1. BUTTON COMPONENT
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-medium tracking-wide transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
          {
            // Primary warm brand amber
            'bg-primary text-white hover:bg-orange-700 shadow-md shadow-orange-700/10': variant === 'primary',
            // Near black secondary
            'bg-accent text-white hover:bg-neutral-800': variant === 'secondary',
            // Refined thin outline
            'border border-border text-foreground hover:bg-muted': variant === 'outline',
            'text-foreground hover:bg-muted': variant === 'ghost',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
          },
          {
            'px-3.5 py-1.5 text-xs': size === 'sm',
            'px-5 py-2.5 text-sm': size === 'md',
            'px-6 py-3.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// ==========================================
// 2. CARD COMPONENTS
// ==========================================
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-2xl border border-border bg-card/60 backdrop-blur-md p-6 shadow-sm cafe-panel', className)} {...props} />
);

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-serif font-bold text-xl tracking-tight text-foreground', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-xs text-muted-foreground', className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('', className)} {...props} />
);

// ==========================================
// 3. INPUT COMPONENT
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// 4. BADGE COMPONENT
// ==========================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'info' | 'danger' | 'neutral';
}

export const Badge = ({ className, variant = 'neutral', ...props }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border',
        {
          'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400': variant === 'success',
          'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400': variant === 'warning',
          'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400': variant === 'info',
          'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400': variant === 'danger',
          'bg-zinc-500/10 border-zinc-500/25 text-zinc-600 dark:text-zinc-400': variant === 'neutral',
        },
        className
      )}
      {...props}
    />
  );
};

// ==========================================
// 5. TABLE COMPONENTS
// ==========================================
export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-auto rounded-xl border border-border">
    <table className={cn('w-full text-sm text-left border-collapse bg-background/30', className)} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('bg-muted/80 text-muted-foreground font-semibold text-xs border-b border-border', className)} {...props} />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...props} />
);

export const TableHead = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <th className={cn('px-4 py-3.5 align-middle select-none font-medium', className)} {...props} />
);

export const TableCell = ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3.5 align-middle', className)} {...props} />
);

// ==========================================
// 6. DIALOG COMPONENT (SIMPLE MOCK DIALOG MODAL)
// ==========================================
export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog = ({ isOpen, onClose, title, children }: DialogProps) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen) return null;
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg p-6 rounded-2xl border border-border bg-card shadow-2xl cafe-panel mx-4">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
          <h3 className="font-serif font-bold text-lg text-foreground tracking-tight">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors font-bold">×</button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
