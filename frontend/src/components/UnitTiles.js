import "./UnitTiles.css";

const UnitTiles = ({ units, projectMap, wingMap, onSelect, getFloor, getPrice }) => {
  if (!Array.isArray(units) || units.length === 0) {
    return <div className="unit-tiles-empty">No units to show.</div>;
  }

  return (
    <section className="unit-tiles-grid">
      {units.map((unit) => (
        <button
          type="button"
          className={`unit-tile-card ${unit._statusCategory}`}
          key={unit.id ?? unit._unitLabel}
          onClick={() => onSelect?.(unit)}
        >
          <div className="unit-tile-header">
            <span className="unit-tile-title">{unit._unitLabel}</span>
            <span className={`status-pill ${unit._statusCategory}`}>
              {unit._statusLabel}
            </span>
          </div>
          <div className="unit-tile-meta">
            <span>{projectMap?.get(String(unit._projectId ?? "")) || "-"}</span>
            <span>{wingMap?.get(String(unit._wingId ?? "")) || "-"}</span>
          </div>
          <div className="unit-tile-footer">
            <span>Floor {getFloor ? getFloor(unit) : "-"}</span>
            <span>{getPrice ? getPrice(unit) : "-"}</span>
          </div>
        </button>
      ))}
    </section>
  );
};

export default UnitTiles;
