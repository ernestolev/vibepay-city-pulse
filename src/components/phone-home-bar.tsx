import { useAppContext } from "@/lib/app-context";
import { cn } from "@/lib/utils";

/**
 * iOS-style home indicator: la franja y la pastilla son solo visuales; el toque
 * activa minimizar solo en una tira baja y estrecha para no chocar con el tab bar.
 */
export function PhoneHomeBar() {
  const { setDeviceBootStage, clearWalletSession } = useAppContext();

  const onMinimize = () => {
    clearWalletSession();
    setDeviceBootStage("springboard");
  };

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto flex h-9 max-w-md flex-col items-center justify-end bg-gradient-to-t from-black/10 to-transparent pb-0.5"
        aria-hidden
      >
        <span className="pointer-events-none h-1.5 w-32 rounded-full bg-foreground/35 shadow-[0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-foreground/10" />
      </div>
      {/** Toca solo una franja baja sobre la pastilla; el resto pasa a los iconos del nav */}
      <button
        type="button"
        onClick={onMinimize}
        className={cn(
          "fixed left-1/2 z-[51] w-32 max-w-md -translate-x-1/2 border-0 bg-transparent p-0",
          "bottom-0.5 h-3 cursor-pointer outline-none",
          "rounded-full active:opacity-70",
        )}
        aria-label="Minimizar a la pantalla de inicio"
      />
    </>
  );
}
