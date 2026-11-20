import { mapText } from '../services/mapText.js';
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useGameStore } from '../stores/gameStore.js';
export default function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  wide = false,
  variant = 'command',
}) {
  const ref = useRef();
  const systemReduced = useReducedMotion();
  const settingReduced = useGameStore((s) => s.settings.reducedMotion);
  const reduced = systemReduced || settingReduced;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    document.body.style.overflow = 'hidden';
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const els = ref.current?.querySelectorAll(
          'button:not([disabled]),input,select,a[href],textarea',
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    const focusTimer = setTimeout(() => ref.current?.querySelector('button,input')?.focus(), 30);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{
            opacity: 0,
          }}
          animate={{
            opacity: 1,
          }}
          exit={{
            opacity: 0,
          }}
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.section
            ref={ref}
            initial={
              reduced
                ? false
                : {
                    opacity: 0,
                    y: 12,
                    scale: 0.96,
                    filter: 'blur(5px)',
                    clipPath: 'inset(45% 0 round 6px)',
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              filter: 'blur(0px)',
              clipPath: 'inset(0% 0 round 6px)',
            }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.98,
            }}
            transition={{
              duration: reduced ? 0 : 0.32,
            }}
            className={`modal holo-panel modal-${variant} ${wide ? 'wide' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow gold">
                  <i className="holo-status-light" />
                  {mapText('GALACTIC COMMAND / SECURE CHANNEL')}
                </span>
                <h2 id="modal-title">{mapText(title)}</h2>
                {subtitle && <p>{subtitle}</p>}
              </div>
              <button
                className="icon-button close-modal"
                aria-label="Close dialog"
                onClick={onClose}
              >
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
