import { useEffect, useState } from "react";

interface StatusBarProps {
  simulatedTime?: string | null;
}

function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function CellularIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 17 12" className={className} aria-hidden="true" fill="currentColor">
      <rect x="0" y="8" width="3" height="4" rx="0.7" />
      <rect x="4.5" y="6" width="3" height="6" rx="0.7" />
      <rect x="9" y="3" width="3" height="9" rx="0.7" />
      <rect x="13.5" y="0" width="3" height="12" rx="0.7" />
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 12" className={className} aria-hidden="true" fill="currentColor">
      <path d="M8 11.4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4Z" />
      <path d="M11.93 7.95a.65.65 0 0 1-.92 0 4.25 4.25 0 0 0-6 0 .65.65 0 1 1-.92-.92 5.55 5.55 0 0 1 7.84 0 .65.65 0 0 1 0 .92Z" />
      <path d="M14.45 5.4a.65.65 0 0 1-.92 0 8.05 8.05 0 0 0-11.4 0 .65.65 0 0 1-.92-.92 9.35 9.35 0 0 1 13.24 0 .65.65 0 0 1 0 .92Z" />
    </svg>
  );
}

function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 27 12" className={className} aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="22"
        height="11"
        rx="2.8"
        ry="2.8"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
      />
      <rect x="2" y="2" width="19" height="8" rx="1.6" ry="1.6" fill="currentColor" />
      <rect
        x="23.5"
        y="4"
        width="1.8"
        height="4"
        rx="0.9"
        ry="0.9"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export function StatusBar({ simulatedTime }: StatusBarProps) {
  const [systemTime, setSystemTime] = useState<string>(() => formatTime(new Date()));

  useEffect(() => {
    if (simulatedTime) return;

    const update = () => setSystemTime(formatTime(new Date()));
    update();
    const intervalId = window.setInterval(update, 30 * 1000);

    return () => window.clearInterval(intervalId);
  }, [simulatedTime]);

  const displayTime = simulatedTime ?? systemTime;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div className="pointer-events-auto flex h-11 w-full max-w-md items-center justify-between bg-background px-7 text-[15px] font-semibold tracking-tight text-foreground">
        <span className="tabular-nums">{displayTime}</span>
        <div className="flex items-center gap-1.5 text-foreground">
          <CellularIcon className="h-[11px] w-[17px]" />
          <WifiIcon className="h-3 w-4" />
          <BatteryIcon className="h-[12px] w-[27px]" />
        </div>
      </div>
    </div>
  );
}
