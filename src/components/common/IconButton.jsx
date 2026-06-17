export function IconButton({ title, children, className = "", ...props }) {
  return (
    <button type="button" className={`icon-button ${className}`} title={title} aria-label={title} {...props}>
      {children}
    </button>
  );
}
