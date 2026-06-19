import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { IconButton } from "./IconButton";

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = "md",
  className = "",
  bodyClassName = "",
  mobileSheet = true,
}) {
  const shellRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key !== "Tab") return;
      const node = shellRef.current;
      if (!node) return;
      const focusable = [...node.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
        .filter((item) => !item.disabled && item.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => {
      const first = shellRef.current?.querySelector("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
      (first || shellRef.current)?.focus?.();
    });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      restoreFocusRef.current?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={`modal-backdrop ${mobileSheet ? "modal-mobile-sheet" : ""}`} onMouseDown={onClose}>
      <section
        ref={shellRef}
        className={`modal-shell modal-${size} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            {eyebrow && <span className="modal-eyebrow">{eyebrow}</span>}
            <strong>{title}</strong>
          </div>
          <IconButton title="Close" onClick={onClose}><X size={18} /></IconButton>
        </header>
        <div className={`modal-body ${bodyClassName}`}>{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}
