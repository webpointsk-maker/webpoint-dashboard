import { Suspense } from "react";
import { after } from "next/server";
import { PageHeader } from "@/components/page-header";
import { TasksView } from "@/components/tasks/tasks-view";
import { AiTaskComposer } from "@/components/ai/ai-task-composer";
import { getClients, getProfiles, getTasks } from "@/lib/data";
import { maybePullCalendarChanges } from "@/lib/google/calendar";

export const metadata = { title: "Tasky · WebPoint" };

export default async function TasksPage() {
  after(() => maybePullCalendarChanges());
  const [tasks, clients, profiles] = await Promise.all([getTasks(), getClients(), getProfiles()]);
  const open = tasks.filter((t) => t.status !== "done").length;

  return (
    <>
      <PageHeader title="Tasky" description={`${open} otvorených taskov`} />
      <div className="mb-6">
        <AiTaskComposer clients={clients.map((c) => ({ id: c.id, name: c.name }))} profiles={profiles} compact />
      </div>
      <Suspense>
        <TasksView
          tasks={tasks}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          profiles={profiles}
        />
      </Suspense>
    </>
  );
}
