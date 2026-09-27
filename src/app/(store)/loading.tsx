import { ProductGridSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container-page space-y-6 py-8">
      <Skeleton className="h-8 w-56" />
      <ProductGridSkeleton />
    </div>
  );
}
