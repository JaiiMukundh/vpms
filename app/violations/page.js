import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ResourcePage from "@/components/ResourcePage";
import { resourceDefinitions } from "@/lib/vpms-data";

export default function ViolationsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Violations"
          description="Track fines, payment status, and the staff member who issued each violation."
        />
        <ResourcePage definition={resourceDefinitions.violations} />
      </div>
    </AppShell>
  );
}

