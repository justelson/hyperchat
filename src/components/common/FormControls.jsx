import { Check } from "lucide-react";

export function ToggleRow({ checked, onChange, title, description, icon: Icon }) {
  return (
    <button type="button" className="toggle-row" onClick={() => onChange?.(!checked)}>
      <span className="toggle-copy">
        {Icon && <Icon size={17} />}
        <span>
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>
      </span>
      <span className={`switch ${checked ? "checked" : ""}`} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

export function CheckboxRow({ checked, onChange, children, disabled = false }) {
  return (
    <button type="button" disabled={disabled} className={`checkbox-row ${checked ? "checked" : ""}`} onClick={() => onChange?.(!checked)}>
      <span className="checkbox-box">{checked && <Check size={13} />}</span>
      <span>{children}</span>
    </button>
  );
}

export function SegmentControl({ value, onChange, options, className = "" }) {
  return (
    <div className={`segment-control ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({ value, onChange, swatches = [] }) {
  return (
    <div className="color-picker">
      <div className="swatch-row">
        {swatches.map((color) => (
          <button
            key={color}
            type="button"
            className={value === color ? "active" : ""}
            style={{ "--swatch": color }}
            onClick={() => onChange(color)}
            aria-label={`Use color ${color}`}
          />
        ))}
      </div>
      <label className="custom-color">
        <span>Custom</span>
        <input type="color" value={value || "#a85612"} onChange={(event) => onChange(event.target.value)} />
      </label>
    </div>
  );
}
