import { useNavigation } from "react-router";
import { useEffect, useRef } from "react";
import { clsx } from "clsx";

export function GlobalLoading() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (active) {
      ref.current.style.width = "0%";
      ref.current.style.opacity = "1";
      ref.current.style.transition = "none";
      
      // Force reflow
      void ref.current.offsetWidth;
      
      ref.current.style.transition = "width 3s ease-out";
      ref.current.style.width = "70%";
    } else {
      ref.current.style.transition = "width 0.3s ease-out, opacity 0.3s ease-out 0.2s";
      ref.current.style.width = "100%";
      ref.current.style.opacity = "0";
    }
  }, [active]);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-[3px] pointer-events-none">
      <div
        ref={ref}
        className={clsx(
          "h-full bg-primary",
        )}
        style={{ width: "0%", opacity: 0 }}
      />
    </div>
  );
}
