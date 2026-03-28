import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'Nothing to show',
  description = 'Data will appear here once activity starts.',
  action,
  icon: Icon = Inbox,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={24} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
