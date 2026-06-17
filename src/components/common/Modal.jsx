import { X } from "lucide-react";
import { useEffect } from "react";
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
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={`modal-backdrop ${mobileSheet ? "modal-mobile-sheet" : ""}`} onMouseDown={onClose}>
      <section className={`modal-shell modal-${size} ${className}`} onMouseDown={(event) => event.stopPropagation()}>
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
