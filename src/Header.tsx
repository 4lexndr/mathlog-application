interface HeaderBarProps {
    resetLogForm: () => void
}

function HeaderBar({ resetLogForm }: HeaderBarProps) {
  return (
    <header id="header-bar">
        <a id="brand-name" href="#dashboard">mathlog</a>
        <div className="header-actions">
          <label className="header-navigation">
            <select
              className="header-page-select"
              aria-label="Navigate to page"
              onChange={(event) => {
                window.location.hash = event.target.value
              }}
            >
              <option value="" disabled>Navigate</option>
              <option value="dashboard">Dashboard</option>
              <option value="weekly-review">Weekly review</option>
              <option value="journal">Journal</option>
              <option value="history">History</option>
              <option value="settings">Settings</option>
            </select>
          </label>
          <button id="new-log-button" type="button"
            onClick={() => {
              resetLogForm()
              window.location.hash = "log"
            }}
          >
            <span aria-hidden="true">＋</span>
            New log
          </button>
        </div>
    </header>
  )
}

export default HeaderBar
