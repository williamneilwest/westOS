import { CalendarClock, Heart, Home, NotebookTabs } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardHeader } from '../../app/ui/Card';
import { SectionHeader } from '../../app/ui/SectionHeader';

const systems = [
  {
    key: 'calendar',
    label: 'Calendar and commitments',
    icon: CalendarClock,
    preview: '2 commitments today',
    detail: 'Next: Family check-in at 6:30 PM',
  },
  {
    key: 'health',
    label: 'Health and routines',
    icon: Heart,
    preview: 'Last logged: 8h sleep',
    detail: 'Morning walk streak: 4 days',
  },
  {
    key: 'home',
    label: 'Home and family logistics',
    icon: Home,
    preview: '1 pending task',
    detail: 'Pending: Groceries and laundry reset',
  },
];

export function LifePage() {
  const [activeSection, setActiveSection] = useState('calendar');
  const [commitmentsToday, setCommitmentsToday] = useState(2);
  const [routineLog, setRoutineLog] = useState('8h sleep logged this morning');
  const [quickNote, setQuickNote] = useState('Pick up groceries before 7 PM.');
  const [noteDraft, setNoteDraft] = useState('');
  const [updatedAt, setUpdatedAt] = useState(new Date());

  const activeItem = useMemo(() => systems.find((item) => item.key === activeSection) || systems[0], [activeSection]);

  function markUpdated() {
    setUpdatedAt(new Date());
  }

  function handleAddCommitment() {
    setCommitmentsToday((current) => current + 1);
    markUpdated();
  }

  function handleLogRoutine() {
    setRoutineLog('Routine logged just now');
    markUpdated();
  }

  function handleQuickNote() {
    const normalized = String(noteDraft || '').trim();
    if (!normalized) {
      return;
    }
    setQuickNote(normalized);
    setNoteDraft('');
    markUpdated();
  }

  return (
    <section className="module">
      <SectionHeader
        tag="/life"
        title="Life"
        description="Personal systems stay visible here without bleeding into work or service operations."
      />

      <div className="life-actions" role="group" aria-label="Life quick actions">
        <button className="compact-toggle" onClick={handleAddCommitment} type="button">
          Add Commitment
        </button>
        <button className="compact-toggle" onClick={handleLogRoutine} type="button">
          Log Routine
        </button>
        <button className="compact-toggle" onClick={handleQuickNote} type="button">
          Quick Note
        </button>
        <input
          className="ticket-queue__filter life-note-input"
          onChange={(event) => setNoteDraft(event.target.value)}
          placeholder="Add a quick note"
          value={noteDraft}
        />
      </div>

      <div className="life-grid">
        <Card tone="emerald">
          <CardHeader
            eyebrow="Core loops"
            title="Structured personal operations"
            description="Small daily entry points that keep routines practical and quiet."
          />
          <div className="life-systems-list">
            {systems.map((system) => {
              const isActive = activeSection === system.key;
              return (
                <button
                  key={system.key}
                  className={`life-system-item${isActive ? ' life-system-item--active' : ''}`}
                  onClick={() => setActiveSection(system.key)}
                  type="button"
                >
                  <span className="icon-badge">
                    <system.icon size={16} />
                  </span>
                  <span className="life-system-item__copy">
                    <strong>{system.label}</strong>
                    <small>{system.preview}</small>
                    {isActive ? <em>{system.detail}</em> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            eyebrow="Today"
            title="Today Snapshot"
            description="Minimal visibility for commitments, routines, and notes."
          />
          <div className="life-snapshot">
            <p>{`${commitmentsToday} commitment${commitmentsToday === 1 ? '' : 's'} today`}</p>
            <p>{`Recent routine: ${routineLog}`}</p>
            <p>{`Quick note: ${quickNote}`}</p>
            <p>{`Focused area: ${activeItem.label}`}</p>
          </div>
          <div className="signal-panel">
            <div className="signal-panel__item life-updated-row">
              <NotebookTabs size={16} />
              <div>
                <strong>Last updated</strong>
                <p>{updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <p className="life-footnote">Deliberately small: useful daily signals without becoming a second work dashboard.</p>
    </section>
  );
}
