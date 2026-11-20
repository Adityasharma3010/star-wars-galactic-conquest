import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

function textOf(value) {
  if (Array.isArray(value)) return value.map(textOf).join('');
  if (isValidElement(value)) return textOf(value.props.children);
  return value == null || typeof value === 'boolean' ? '' : String(value);
}
export default function HoloSelect({
  children,
  value,
  onChange,
  disabled = false,
  className = '',
  ...props
}) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((option) => ({
      value: String(option.props.value ?? textOf(option.props.children)),
      label: textOf(option.props.children),
      disabled: Boolean(option.props.disabled),
    }));
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === String(value)),
  );
  const id = useId();
  const trigger = useRef();
  const menu = useRef();
  const search = useRef({ text: '', time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const [labelId, setLabelId] = useState();
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const label = trigger.current.closest('label')?.querySelector('span');
    if (label && !props['aria-label']) {
      label.id ||= id + '-label';
      setLabelId(label.id);
    }
  }, [id, props['aria-label']]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const box = trigger.current.getBoundingClientRect();
      const width = Math.min(Math.max(box.width, 210), innerWidth - 24);
      const below = innerHeight - box.bottom - 16;
      const above = box.top - 16;
      const up = below < 180 && above > below;
      setPosition({
        left: Math.max(12, Math.min(box.left, innerWidth - width - 12)),
        width,
        maxHeight: Math.min(280, Math.max(90, up ? above : below)),
        ...(up ? { bottom: innerHeight - box.top + 6 } : { top: box.bottom + 6 }),
      });
    };
    place();
    const outside = (event) => {
      if (!trigger.current.contains(event.target) && !menu.current?.contains(event.target))
        setOpen(false);
    };
    const scroll = (event) => {
      if (!menu.current?.contains(event.target)) place();
    };
    const resize = place;
    const key = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
        trigger.current.focus();
      }
    };
    document.addEventListener('pointerdown', outside, true);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', resize);
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      window.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', resize);
      document.removeEventListener('keydown', key, true);
    };
  }, [open]);
  useEffect(() => {
    if (open)
      document.getElementById(id + '-option-' + active)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open, position]);
  const choose = (index) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange?.({ target: { value: option.value }, currentTarget: { value: option.value } });
    setOpen(false);
    trigger.current.focus();
  };
  const move = (direction) => {
    let index = open ? active : selected;
    for (let count = 0; count < options.length; count++) {
      index = (index + direction + options.length) % options.length;
      if (!options[index].disabled) {
        setActive(index);
        break;
      }
    }
    setOpen(true);
  };
  return (
    <div className={'holo-select ' + className}>
      <button
        {...props}
        ref={trigger}
        type="button"
        role="combobox"
        disabled={disabled}
        className="holo-select-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? id + '-menu' : undefined}
        aria-labelledby={props['aria-labelledby'] || labelId}
        aria-activedescendant={open ? id + '-option-' + active : undefined}
        data-value={String(value)}
        onClick={() => {
          setActive(selected);
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (open) event.stopPropagation();
            setOpen(false);
            return;
          }
          if (event.key === 'Tab') {
            setOpen(false);
            return;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            move(event.key === 'ArrowDown' ? 1 : -1);
            return;
          }
          if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            setActive(
              event.key === 'Home'
                ? options.findIndex((option) => !option.disabled)
                : options.findLastIndex((option) => !option.disabled),
            );
            setOpen(true);
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (open) choose(active);
            else {
              setActive(selected);
              setOpen(true);
            }
            return;
          }
          if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            const now = Date.now();
            search.current.text =
              (now - search.current.time < 600 ? search.current.text : '') +
              event.key.toLowerCase();
            search.current.time = now;
            const index = options.findIndex(
              (option) =>
                !option.disabled && option.label.toLowerCase().startsWith(search.current.text),
            );
            if (index >= 0) {
              setActive(index);
              setOpen(true);
            }
          }
        }}
      >
        <span>{options[selected]?.label || 'Choose an option'}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={menu}
            id={id + '-menu'}
            role="listbox"
            aria-labelledby={labelId}
            aria-label={props['aria-label']}
            className="holo-select-menu"
            style={position}
          >
            {options.map((option, index) => (
              <div
                key={option.value + index}
                id={id + '-option-' + index}
                role="option"
                data-value={option.value}
                aria-selected={index === selected}
                aria-disabled={option.disabled || undefined}
                className={
                  'holo-select-option ' +
                  (active === index ? 'active ' : '') +
                  (index === selected ? 'selected ' : '')
                }
                onPointerMove={() => {
                  if (!option.disabled) setActive(index);
                }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {index === selected && <Check size={14} aria-hidden="true" />}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
