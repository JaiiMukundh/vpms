import AppShell from "@/components/AppShell";
import ReportsPage from "@/components/ReportsPage";

export default function ReportsRoutePage({ searchParams }) {
  return (
    <AppShell>
      <ReportsPage initialTab={searchParams?.tab || ""} />
    </AppShell>
  );
}
