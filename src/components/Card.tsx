import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Card({ title, description, icon: Icon, className = '', children }: CardProps) {
  return (
    <section
      className={`animate-fade-up rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,20,30,0.04)] sm:p-6 ${className}`}
    >
      <header className="mb-4">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
          {Icon && <Icon className="size-4" aria-hidden="true" />}
          {title}
        </h3>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </header>
      {children}
    </section>
  );
}
