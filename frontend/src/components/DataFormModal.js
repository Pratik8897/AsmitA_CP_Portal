const DataFormModal = ({
  title,
  isOpen,
  onClose,
  onSubmit,
  saving = false,
  error = "",
  submitLabel = "Save",
  savingLabel = "Saving...",
  cancelLabel = "Cancel",
  withGrid = true,
  actions = null,
  children,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="data-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="data-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="data-modal-header">
          <h3>{title}</h3>
          <button
            type="button"
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            X
          </button>
        </div>
        <form className="data-form" onSubmit={onSubmit}>
          {withGrid ? <div className="data-form-grid">{children}</div> : children}
          {error ? <div className="data-form-error">{error}</div> : null}
          {actions ? (
            <div className="data-form-actions">{actions}</div>
          ) : (
            <div className="data-form-actions">
              <button type="button" className="action-btn" onClick={onClose}>
                {cancelLabel}
              </button>
              <button type="submit" className="action-btn add" disabled={saving}>
                {saving ? savingLabel : submitLabel}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default DataFormModal;
