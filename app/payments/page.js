import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ResourcePage from "@/components/ResourcePage";
import { resourceDefinitions } from "@/lib/vpms-data";

export default function PaymentsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Payments"
          description="Record parking payments against generated fees. Fee and exit lookups use readable dropdowns."
        />
        <ResourcePage definition={resourceDefinitions.payments} />
      </div>
    </AppShell>
  );
}

