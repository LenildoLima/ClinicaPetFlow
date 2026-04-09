import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary/30 mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-10 h-10" />
      </div>
      <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-400 font-medium max-w-[280px] mx-auto mb-8">
        {description}
      </p>
      {action && (
        <div className="animate-in slide-in-from-bottom-2 duration-700">
          {action}
        </div>
      )}
    </div>
  );
}
