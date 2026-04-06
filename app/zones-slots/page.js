import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ResourcePage from "@/components/ResourcePage";
import { resourceDefinitions } from "@/lib/vpms-data";

export default function ZonesSlotsPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Zones & Slots"
          description="Maintain zone pricing and slot allocation. Slots are assigned to vehicles during entry."
        />
        <div className="space-y-6">
          <ResourcePage definition={resourceDefinitions.parking_zones} />
          <ResourcePage definition={resourceDefinitions.slots} />
        </div>
      </div>
    </AppShell>
  );
}

