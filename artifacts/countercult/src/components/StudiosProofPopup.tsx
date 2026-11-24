const clientRecords = [
  {
    label: "Leadership and client experience",
    names: [
      "The Museum of Modern Art (MoMA)",
      "Fendi",
      "Tommy Hilfiger",
      "Ann Taylor",
      "Sunday Natural",
      "New York Fashion Week",
    ],
  },
  {
    label: "Countercult studio projects",
    names: [
      "Klunkerkranich",
      "Zalando Pride",
      "Most Wanted: Music",
      "Quouch",
      "The Delta",
    ],
  },
];

function ClientMarquee({ names }: { names: string[] }) {
  const group = (duplicate = false) => (
    <span className="cc-studios-proof-group">
      {names.map((name, index) => (
        <span key={`${duplicate ? "duplicate-" : ""}${name}`}>
          <span>{name}</span>
          {index < names.length - 1 && <i aria-hidden="true"> / </i>}
        </span>
      ))}
    </span>
  );

  return (
    <div className="cc-studios-proof-marquee" aria-label={names.join(", ")}>
      <div className="cc-studios-proof-track">
        {group()}
        <span aria-hidden="true">{group(true)}</span>
      </div>
    </div>
  );
}

export function StudiosProofPopup({ onClose }: { onClose: () => void }) {
  return (
    <aside
      className="cc-studios-proof-popup"
      role="dialog"
      aria-labelledby="studios-proof-title"
    >
      <div className="cc-studios-proof-bar">
        <span><i aria-hidden="true" /> countercult / clients + partners / selected record</span>
        <button type="button" onClick={onClose} aria-label="Close clients and partners window">×</button>
      </div>
      <div className="cc-studios-proof-content">
        <strong id="studios-proof-title">Experience across leadership + studio delivery</strong>
        {clientRecords.map((record) => (
          <div className="cc-studios-proof-row" key={record.label}>
            <p className="cc-studios-proof-label">{record.label}</p>
            <ClientMarquee names={record.names} />
          </div>
        ))}
      </div>
    </aside>
  );
}
