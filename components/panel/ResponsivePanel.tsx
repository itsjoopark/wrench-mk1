"use client";

import { useMediaQuery } from "@/lib/use-media-query";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

// Desktop (lg+): an always-visible glass card beside the stage.
// Mobile: a bottom sheet that opens when there's something to show.
export default function ResponsivePanel({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) {
    return (
      <aside className="sticky top-24 hidden lg:block">
        <div className="glass-heavy rounded-3xl p-6">{children}</div>
      </aside>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass-heavy max-h-[85dvh] overflow-y-auto rounded-t-3xl border-x-0 border-b-0"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-black/15" />
        <div className="p-5 pt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
