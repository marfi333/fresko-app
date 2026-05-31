"use client";

import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const PANEL_WIDTH = 144;
const OPEN_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 300;

type SwipeContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const SwipeContext = createContext<SwipeContextValue | null>(null);

export const SwipeRowProvider = ({ children }: { children: ReactNode }) => {
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!openId) return;
    const close = () => setOpenId(null);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => window.removeEventListener("scroll", close, { capture: true });
  }, [openId]);

  return <SwipeContext.Provider value={{ openId, setOpenId }}>{children}</SwipeContext.Provider>;
};

const useSwipeContext = (): SwipeContextValue => {
  const ctx = useContext(SwipeContext);
  if (!ctx) {
    return { openId: null, setOpenId: () => {} };
  }
  return ctx;
};

type SwipeRowProps = {
  children: ReactNode;
  actions: ReactNode;
  disabled?: boolean;
};

export const SwipeRow = ({ children, actions, disabled = false }: SwipeRowProps) => {
  const id = useId();
  const { openId, setOpenId } = useSwipeContext();
  const isOpen = openId === id;
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    x.set(isOpen ? -PANEL_WIDTH : 0);
  }, [isOpen, x]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen, setOpenId]);

  const handleDragEnd = useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;
      const shouldOpen = offset < -OPEN_THRESHOLD || velocity < -VELOCITY_THRESHOLD;
      const shouldClose = offset > OPEN_THRESHOLD || velocity > VELOCITY_THRESHOLD;
      if (isOpen && shouldClose) {
        setOpenId(null);
      } else if (!isOpen && shouldOpen) {
        setOpenId(id);
      } else {
        x.set(isOpen ? -PANEL_WIDTH : 0);
      }
    },
    [id, isOpen, setOpenId, x]
  );

  const panelOpacity = useTransform(x, [-PANEL_WIDTH, 0], [1, 0]);

  if (disabled) {
    return <div className="md:contents">{children}</div>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden md:overflow-visible">
      <motion.div
        className="absolute inset-y-0 right-0 flex items-stretch md:hidden"
        style={{ width: PANEL_WIDTH, opacity: panelOpacity }}
      >
        {actions}
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -PANEL_WIDTH, right: 0 }}
        dragElastic={0.05}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="bg-background md:translate-x-0"
      >
        {children}
      </motion.div>
    </div>
  );
};

export const useSwipeRowController = () => {
  const { openId, setOpenId } = useSwipeContext();
  return { openId, close: () => setOpenId(null) };
};
