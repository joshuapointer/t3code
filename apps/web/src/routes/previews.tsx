import { createFileRoute } from "@tanstack/react-router";

import { PreviewHub } from "../components/PreviewHub";
import { SidebarInset, SidebarTrigger } from "../components/ui/sidebar";
import { isElectron } from "../env";

function PreviewsRouteView() {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground isolate">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground">
        {!isElectron && (
          <header className="border-b border-border px-3 py-2 sm:px-5 md:hidden">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="size-7 shrink-0" />
              <span className="text-sm font-medium text-foreground">Preview Hub</span>
            </div>
          </header>
        )}

        {isElectron && (
          <div className="drag-region flex h-[52px] shrink-0 items-center border-b border-border px-5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground/70">
              Preview Hub
            </span>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col">
          <PreviewHub />
        </div>
      </div>
    </SidebarInset>
  );
}

export const Route = createFileRoute("/previews")({
  component: PreviewsRouteView,
});
