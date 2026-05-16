import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import clsx from 'clsx';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip = ({ content, children, position = 'top', className }: TooltipProps) => {
  const [show, setShow] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || <HelpCircle size={14} className="text-slate-500 hover:text-mcvill-accent cursor-help" />}
      
      {show && (
        <div className={clsx(
          "absolute z-50 px-3 py-2 text-xs font-medium bg-slate-900 border border-white/10 rounded-lg shadow-xl whitespace-pre-line max-w-[250px]",
          positions[position]
        )}>
          <div className={clsx(
            "absolute w-2 h-2 bg-slate-900 rotate-45",
            position === 'top' && "left-1/2 -translate-x-1/2 -bottom-1 border-b border-r border-white/10",
            position === 'bottom' && "left-1/2 -translate-x-1/2 -top-1 border-t border-r border-white/10",
            position === 'left' && "top-1/2 -translate-y-1/2 -right-1 border-b border-r border-white/10",
            position === 'right' && "top-1/2 -translate-y-1/2 -left-1 border-t border-l border-white/10"
          )} />
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
