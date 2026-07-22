import React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

type DestructiveActionDialogProps = {
  trigger: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
};

export function DestructiveActionDialog({
  trigger,
  title,
  description,
  actionLabel,
  onConfirm,
}: DestructiveActionDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="space-y-2">
            <AlertDialog.Title className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm leading-6 text-slate-600">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-slate-500">
              Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
              onClick={onConfirm}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-risk px-4 py-2 text-sm font-semibold text-white hover:bg-risk/90"
            >
              {actionLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
