import { EntityTags } from '../shared/tags/EntityTags';
import { EventLog } from '../ui/EventLog';
import { Inspector } from '../ui/Inspector';
import { Sidebar } from '../ui/Sidebar';
import { TopBar } from '../ui/TopBar';
import { Scene } from './Scene';

export default function App() {
  return (
    <div className="app">
      <Scene />
      <EntityTags />
      <div className="hud">
        <TopBar />
        <Sidebar />
        <div className="right-col">
          <Inspector />
          <EventLog />
        </div>
      </div>
    </div>
  );
}
