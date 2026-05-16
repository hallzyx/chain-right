import { MyWorks } from "@/components/my-works";
import { ComputeStatus } from "@/components/compute-status";

/**
 * Página de obras de la wallet conectada.
 * Black & Amber Edition.
 */
export default function MyWorksPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 md:px-0 pb-24">
      <div className="mb-8">
        <ComputeStatus compact />
      </div>
      <MyWorks />
    </div>
  );
}
