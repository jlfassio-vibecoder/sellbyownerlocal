import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type FocusEvent,
  type ChangeEvent,
  type TextareaHTMLAttributes,
} from 'react';

function resize(target: HTMLTextAreaElement) {
  target.style.height = 'auto';
  target.style.height = `${target.scrollHeight}px`;
}

const AutoTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AutoTextarea({ className = '', onChange, onFocus, ...props }, forwardedRef) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (el: HTMLTextAreaElement | null) => {
        innerRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      },
      [forwardedRef]
    );

    useEffect(() => {
      if (innerRef.current) resize(innerRef.current);
    }, []);

    useLayoutEffect(() => {
      const el = innerRef.current;
      if (el && el.offsetParent !== null) resize(el);
    });

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      resize(e.currentTarget);
      onChange?.(e);
    };

    const handleFocus = (e: FocusEvent<HTMLTextAreaElement>) => {
      resize(e.currentTarget);
      onFocus?.(e);
    };

    return (
      <textarea
        {...props}
        ref={setRefs}
        onChange={handleChange}
        onFocus={handleFocus}
        rows={1}
        className={`resize-none overflow-hidden ${className}`}
      />
    );
  }
);

export default AutoTextarea;
