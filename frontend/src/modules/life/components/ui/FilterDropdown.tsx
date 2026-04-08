import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export function FilterDropdown({ value, onChange, options, placeholder = 'Select' }: FilterDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 220 });

  const currentLabel = useMemo(
    () => options.find((option) => option.value === value)?.label || placeholder,
    [options, placeholder, value],
  );

  const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;

  useEffect(() => {
    if (!open || isMobile || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = Math.max(rect.width, 220);
    const maxLeft = window.innerWidth - width - 8;
    let left = Math.min(rect.left, Math.max(8, maxLeft));
    if (left < 8) left = 8;

    const belowTop = rect.bottom + 8;
    const fitsBelow = belowTop + 280 < window.innerHeight;
    const top = fitsBelow ? belowTop : Math.max(8, rect.top - 288);

    setStyle({ top, left, width });
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    const handle = () => setOpen(false);
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="min-h-[44px] w-full rounded-lg border border-white/10 bg-zinc-900/70 px-3 py-2 text-left text-sm text-white"
      >
        {currentLabel}
      </button>

      {open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[9998] bg-black/50"
                onClick={() => setOpen(false)}
                aria-label="Close"
              />

              {isMobile ? (
                <div className="fixed inset-x-0 bottom-0 z-[9999] max-h-[70vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom,0)+1rem)]">
                  <div className="mb-3 h-1.5 w-12 rounded-full bg-zinc-700 mx-auto" />
                  <div className="space-y-2">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="min-h-[44px] w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-left text-sm text-white"
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className="fixed z-[9999] max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-2xl"
                  style={{ top: style.top, left: style.left, width: style.width }}
                >
                  <div className="space-y-1">
                    {options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="min-h-[40px] w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>,
            document.body,
          )
        : null}
    </>
  );
}
