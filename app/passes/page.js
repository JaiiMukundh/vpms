import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import ResourcePage from "@/components/ResourcePage";
import { resourceDefinitions } from "@/lib/vpms-data";

export default function PassesPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Passes"
          description="Manage prepaid or long-term parking passes and keep the active/expired status clear."
        />
        <ResourcePage definition={resourceDefinitions.passes} />
      </div>
    </AppShell>
  );
}

