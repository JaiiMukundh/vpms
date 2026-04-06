import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ResourcePage from "@/components/ResourcePage";
import { resourceDefinitions } from "@/lib/vpms-data";

export default function VehiclesPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Vehicles"
          description="Track each vehicle with its owner, number, type, and status."
        />
        <ResourcePage definition={resourceDefinitions.vehicles} />
      </div>
    </AppShell>
  );
}

