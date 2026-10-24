import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Sidebar, ActiveTab } from './components/layout/Sidebar.tsx';
import { DashboardView } from './components/views/DashboardView.tsx';
import { ClassesView } from './components/views/ClassesView.tsx';
import { StudentsView } from './components/views/StudentsView.tsx';
import { AssignmentsView } from './components/views/AssignmentsView.tsx';
import { TrackingView } from './components/views/TrackingView.tsx';
import { AssessmentsView } from './components/views/AssessmentsView.tsx';
import { AnalyticsView } from './components/views/AnalyticsView.tsx';
import { AlertsView } from './components/views/AlertsView.tsx';
import { AiAssistantView } from './components/views/AiAssistantView.tsx';
import { ReportsView } from './components/views/ReportsView.tsx';
import { ImportExportView } from './components/views/ImportExportView.tsx';
import { AdminView } from './components/views/AdminView.tsx';
import { StudentPortalView } from './components/views/StudentPortalView.tsx';

function MainApp() {
  const { isStudent, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [trackingAsgId, setTrackingAsgId] = useState<string | undefined>(undefined);

  // If user is student and currently on teacher-only tab, switch to student portal
  React.useEffect(() => {
    if (isStudent && activeTab !== 'assignments' && activeTab !== 'tracking') {
      setActiveTab('student_portal');
    } else if (!isStudent && activeTab === 'student_portal') {
      setActiveTab('dashboard');
    }
  }, [isStudent]);

  const handleNavigateTracking = (assignmentId: string) => {
    setTrackingAsgId(assignmentId);
    setActiveTab('tracking');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans antialiased">
      {/* Top Header */}
      <Header
        onNavigateAi={() => setActiveTab('ai')}
        onNavigateAlerts={() => setActiveTab('alerts')}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== 'tracking') setTrackingAsgId(undefined);
          }}
        />

        {/* Main Content View Container */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView onNavigateTab={setActiveTab} />}
          {activeTab === 'classes' && <ClassesView />}
          {activeTab === 'students' && <StudentsView />}
          {activeTab === 'assignments' && (
            <AssignmentsView onNavigateTracking={handleNavigateTracking} />
          )}
          {activeTab === 'tracking' && <TrackingView initialAssignmentId={trackingAsgId} />}
          {activeTab === 'assessments' && <AssessmentsView />}
          {activeTab === 'analytics' && <AnalyticsView onNavigateAi={() => setActiveTab('ai')} />}
          {activeTab === 'alerts' && <AlertsView />}
          {activeTab === 'ai' && <AiAssistantView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'import_export' && <ImportExportView />}
          {activeTab === 'admin' && <AdminView />}
          {activeTab === 'student_portal' && <StudentPortalView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
