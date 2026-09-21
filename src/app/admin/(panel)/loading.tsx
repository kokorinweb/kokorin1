import { Skeleton } from "@/components/admin/ui";

/**
 * Скелетон повторяет форму экрана: заголовок, полоса плиток, широкий блок.
 * Спиннер посреди пустой страницы не сообщает ничего, кроме «подожди».
 */
export default function PanelLoading() {
  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-4 sm:px-6 lg:py-6">
      <div className="hidden w-56 shrink-0 lg:block">
        <Skeleton className="h-[calc(100dvh-3rem)]" />
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>

        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
