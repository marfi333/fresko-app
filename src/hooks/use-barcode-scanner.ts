"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

export type BarcodeScannerError = "permission-denied" | "unavailable" | null;

type Controls = { stop: () => void };

type UseBarcodeScannerOptions = {
  onResult: (text: string) => void;
  videoRef?: RefObject<HTMLVideoElement | null>;
};

type UseBarcodeScannerReturn = {
  start: () => Promise<void>;
  stop: () => void;
  isScanning: boolean;
  error: BarcodeScannerError;
};

const ALLOWED_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];

const buildHints = (): Map<DecodeHintType, unknown> => {
  const hints = new Map<DecodeHintType, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, ALLOWED_FORMATS);
  return hints;
};

export const useBarcodeScanner = ({
  onResult,
  videoRef,
}: UseBarcodeScannerOptions): UseBarcodeScannerReturn => {
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<Controls | null>(null);
  const onResultRef = useRef(onResult);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<BarcodeScannerError>(null);

  if (readerRef.current === null) {
    readerRef.current = new BrowserMultiFormatReader(buildHints());
  }

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const releaseStream = useCallback(() => {
    const el = videoRef?.current;
    if (!el) return;
    const stream = el.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => {
      t.stop();
    });
    el.srcObject = null;
  }, [videoRef]);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    controlsRef.current?.stop();
    controlsRef.current = null;
    releaseStream();
    setIsScanning(false);
  }, [releaseStream]);

  const startingRef = useRef(false);
  const cancelledRef = useRef(false);

  const start = useCallback(async () => {
    if (!readerRef.current) return;
    if (startingRef.current || controlsRef.current) return; // already starting / running
    startingRef.current = true;
    cancelledRef.current = false;
    setError(null);
    try {
      const controls = await readerRef.current.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef?.current ?? undefined,
        (result) => {
          if (!result) return;
          onResultRef.current(result.getText());
          controlsRef.current?.stop();
          controlsRef.current = null;
          releaseStream();
          setIsScanning(false);
        }
      );
      // If stop() ran while we were awaiting, tear down immediately.
      if (cancelledRef.current) {
        controls.stop();
        releaseStream();
        return;
      }
      controlsRef.current = controls;
      setIsScanning(true);
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      setError(name === "NotAllowedError" ? "permission-denied" : "unavailable");
      setIsScanning(false);
    } finally {
      startingRef.current = false;
    }
  }, [videoRef, releaseStream]);

  useEffect(() => {
    return () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
      releaseStream();
    };
  }, [releaseStream]);

  return { start, stop, isScanning, error };
};
