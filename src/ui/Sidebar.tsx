import { useState, type ReactNode } from 'react';
import { AgvPanel } from '../features/agv/ui/AgvPanel';
import { DocksPanel } from '../features/docks/ui/DocksPanel';
import { TrucksPanel } from '../features/trucks/ui/TrucksPanel';
import { InventoryPanel } from '../features/warehouse/ui/InventoryPanel';
import { PeoplePanel } from '../features/workers/ui/PeoplePanel';
import { Icons } from './icons';
import { OverviewPanel } from './panels/OverviewPanel';
import { SettingsPanel } from './panels/SettingsPanel';

type TabId = 'overview' | 'trucks' | 'docks' | 'agv' | 'inventory' | 'people' | 'settings';

const TABS: { id: TabId; label: string; icon: ReactNode; panel: () => ReactNode }[] = [
  { id: 'overview', label: 'ภาพรวม', icon: Icons.overview, panel: () => <OverviewPanel /> },
  { id: 'trucks', label: 'รถบรรทุก', icon: Icons.truck, panel: () => <TrucksPanel /> },
  { id: 'docks', label: 'ท่าโหลด', icon: Icons.dock, panel: () => <DocksPanel /> },
  { id: 'agv', label: 'AGV', icon: Icons.agv, panel: () => <AgvPanel /> },
  { id: 'inventory', label: 'คลังสินค้า', icon: Icons.boxes, panel: () => <InventoryPanel /> },
  { id: 'people', label: 'บุคลากร', icon: Icons.people, panel: () => <PeoplePanel /> },
  { id: 'settings', label: 'ตั้งค่า', icon: Icons.settings, panel: () => <SettingsPanel /> },
];

const STORAGE_KEY = 'logisim.tab';

function loadTab(): TabId {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && TABS.some((t) => t.id === v)) return v as TabId;
  } catch {
    // storage unavailable
  }
  return 'overview';
}

export function Sidebar() {
  const [tab, setTab] = useState<TabId>(loadTab);
  // Start collapsed on phones so the 3D view isn't covered.
  const [open, setOpen] = useState(() => window.innerWidth > 900);
  const active = TABS.find((t) => t.id === tab)!;

  const choose = (id: TabId) => {
    if (id === tab) {
      setOpen((o) => !o);
      return;
    }
    setTab(id);
    setOpen(true);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // storage unavailable
    }
  };

  return (
    <aside className={`sidebar ${open ? 'open' : 'closed'}`}>
      <nav className="tabs" aria-label="แผงข้อมูล">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={t.id === tab && open ? 'active' : ''}
            onClick={() => choose(t.id)}
            title={t.label}
            aria-pressed={t.id === tab && open}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {open && (
        <div className="panel-body">
          <h2>{active.label}</h2>
          {active.panel()}
        </div>
      )}
    </aside>
  );
}
