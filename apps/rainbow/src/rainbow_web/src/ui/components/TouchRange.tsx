import { useRef, type InputHTMLAttributes, type PointerEvent } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  value: number;
  onValueChange: (value: number) => void;
};

/** Keep native mouse/keyboard behavior; map touch against the rendered track. */
export function TouchRange({ onValueChange, ...props }: Props) {
  const activePointer = useRef<number | null>(null);
  const update = (event: PointerEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const rect = input.getBoundingClientRect();
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const step = input.step === 'any' ? 0 : Number(input.step || 1);
    // The phone thumb is 24 screen pixels wide before browser pinch zoom.
    const scale = rect.width / input.offsetWidth;
    const thumb = parseFloat(getComputedStyle(input).getPropertyValue('--phone-thumb-size')) * scale;
    const inset = Math.min(thumb / 2, rect.width / 2);
    const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left - inset) / Math.max(1, rect.width - 2 * inset)));
    const raw = min + fraction * (max - min);
    const value = step ? min + Math.round((raw - min) / step) * step : raw;
    onValueChange(Math.max(min, Math.min(max, Number(value.toFixed(10)))));
  };
  return <input {...props} type="range"
    onChange={event => onValueChange(Number(event.target.value))}
    onPointerDown={event => {
      if (event.pointerType === 'mouse' || !event.isPrimary || props.disabled ||
          !event.currentTarget.closest('.phone-presentation')) return;
      event.preventDefault();
      activePointer.current = event.pointerId;
      event.currentTarget.focus({ preventScroll: true });
      event.currentTarget.setPointerCapture(event.pointerId);
      update(event);
    }}
    onPointerMove={event => {
      if (event.pointerId === activePointer.current) { event.preventDefault(); update(event); }
    }}
    onPointerUp={event => {
      if (event.pointerId !== activePointer.current) return;
      update(event);
      activePointer.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    }}
    onPointerCancel={() => { activePointer.current = null; }}
    onLostPointerCapture={() => { activePointer.current = null; }}
  />;
}
