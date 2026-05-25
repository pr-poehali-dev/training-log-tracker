import { useState } from "react";
import type { AppUser } from "@/pages/Index";
import { todayStr, monStr } from "./trainer-ui";
import { StudentsSection, PaymentsSection, AttendanceSection } from "./TrainerSections1";
import { PersonalSection, NotesSection, ReportsSection } from "./TrainerSections2";
import AppShell, { type Tab } from "@/components/layout/AppShell";

export default function TrainerDashboard({ user }: { user: AppUser }) {
  const [tab, setTab] = useState<Tab>("students");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monStr());

  const toolbar = (
    <>
      {(tab === "students" || tab === "attendance") && (
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      )}
      {(tab === "payments" || tab === "personal" || tab === "reports") && (
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      )}
    </>
  );

  return (
    <AppShell tab={tab} onTabChange={setTab} toolbar={toolbar}>
      {tab === "students"   && <StudentsSection   user={user} date={date} month={month} />}
      {tab === "payments"   && <PaymentsSection   user={user} month={month} />}
      {tab === "attendance" && <AttendanceSection user={user} date={date} />}
      {tab === "personal"   && <PersonalSection   user={user} month={month} />}
      {tab === "notes"      && <NotesSection      user={user} />}
      {tab === "reports"    && <ReportsSection    user={user} month={month} />}
    </AppShell>
  );
}
