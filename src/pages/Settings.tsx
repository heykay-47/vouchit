import { useAuth } from '@/contexts/AuthContext';
import UserProfile from '@/components/UserProfile';
import UserSettings from '@/components/UserSettings';
import NotificationPreferences from '@/components/NotificationPreferences';
import { Navigate } from 'react-router-dom';

export default function Settings() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">settings</h1>
        <p className="text-muted-foreground">
          manage your account and preferences
        </p>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-medium lowercase mb-4">profile</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <UserProfile user={user} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium lowercase mb-4">preferences</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <UserSettings />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium lowercase mb-4">notifications</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <NotificationPreferences />
          </div>
        </section>
      </div>
    </div>
  );
}

