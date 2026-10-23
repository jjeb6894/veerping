import { SellerCheckupResponse } from "@/components/SellerCheckupResponse";

export const metadata = {
  title: "TCL Vehicle Checkup Request — TemplateChecklist.com",
};

export default async function CheckupRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-blue-50 via-white to-emerald-50/60">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6 sm:py-14">
        <SellerCheckupResponse requestId={id} />
      </div>
    </div>
  );
}
