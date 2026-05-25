import { useEffect, useState } from 'react';
import Leaderboard from "@/components/Leaderboard";
import RequestSystem from "@/components/RequestSystem";
import UserActivityFeed from "@/components/UserActivityFeed";
import { Button } from "@/components/ui/button";

type Tab = 'requests' | 'activity' | 'leaderboard';

export default function Community() {
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  
  useEffect(() => {
    document.title = "Community - VoucherSwap";
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'requests', label: 'requests' },
    { id: 'activity', label: 'activity' },
    { id: 'leaderboard', label: 'leaderboard' },
  ];

  return (
    <div className="py-4">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">community</h1>
        <p className="text-muted-foreground text-sm">
          connect with other users and discover what's happening
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-card border border-border rounded-lg mb-8 w-fit">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            className={`lowercase text-xs px-4 ${
              activeTab === tab.id 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'requests' && <RequestSystem />}
      {activeTab === 'activity' && <UserActivityFeed limit={15} />}
      {activeTab === 'leaderboard' && <Leaderboard limit={10} />}
    </div>
  );
}
