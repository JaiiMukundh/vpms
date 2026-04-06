import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ResourcePage from "@/components/ResourcePage";
import { resourceDefinitions } from "@/lib/vpms-data";

export default function OwnersPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Owners"
          description="Maintain the people who own the parked vehicles. The forms map directly to the owners table."
        />
        <ResourcePage definition={resourceDefinitions.owners} />
      </div>
    </AppShell>
  );
}

