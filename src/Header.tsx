interface HeaderBarProps {
    resetLogForm: () => void
}

const navigationItems = [
  { href: "#dashboard", label: "Dashboard" },
  { href: "#queue", label: "Queue" },
  { href: "#journal", label: "Journal" },
  { href: "#history", label: "Problem History" },
  { href: "#settings", label: "Settings" },
]

function HeaderBar({ resetLogForm }: HeaderBarProps) {
  return (
    <header id="header-bar">
        <a id="brand-name" href="#dashboard">mathlog</a>
        <div className="header-actions">
          <nav className="header-navigation" aria-label="Primary navigation">
            {navigationItems.map((item) => (
              <a
                key={item.href}
                className="header-page-link"
                href={item.href}
              >
                {item.label}
              </a>
            ))}
          </nav>
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
