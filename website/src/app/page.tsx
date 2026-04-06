export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-sm font-semibold tracking-tight">Glyph</span>
          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
            <a href="#features" className="hover:text-zinc-100 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-zinc-100 transition-colors">How it works</a>
            <a href="#faq" className="hover:text-zinc-100 transition-colors">FAQ</a>
          </nav>
          <a
            href="#download"
            className="text-sm px-4 py-1.5 bg-zinc-100 text-zinc-950 rounded-md font-medium hover:bg-white transition-colors"
          >
            Download
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-6">macOS · Free during beta</p>
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] text-zinc-100 mb-6 max-w-3xl">
            A calm workspace for building with AI agents.
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
            Glyph gives solo developers a focused 3-panel environment — editor, terminal, and browser — purpose-built for working with AI coding agents.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#download"
              className="px-6 py-3 bg-zinc-100 text-zinc-950 text-sm font-medium rounded-md hover:bg-white transition-colors"
            >
              Download for macOS
            </a>
            <a
              href="#how-it-works"
              className="px-6 py-3 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              See how it works →
            </a>
          </div>
        </div>
      </section>

      {/* App screenshot placeholder */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 aspect-[16/10] flex items-center justify-center">
            <span className="text-sm text-zinc-600 font-mono">app screenshot</span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-24 border-t border-zinc-800/60">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-12">How it works</p>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { n: '01', title: 'Open a project', body: 'Point Glyph at any local folder. It detects your stack and sets up a dev server automatically.' },
              { n: '02', title: 'Run your agent', body: 'Launch Claude Code, Cursor, or any AI agent in the built-in terminal. Watch it work in real time.' },
              { n: '03', title: 'Review and iterate', body: 'See file changes in the editor and a live preview in the browser — without leaving the window.' },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <p className="text-xs font-mono text-zinc-600 mb-4">{n}</p>
                <h3 className="text-base font-semibold text-zinc-100 mb-2">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24 border-t border-zinc-800/60">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-12">Features</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Monaco Editor', body: 'Full VS Code editing experience with syntax highlighting, multi-tab support, and drag-to-reorder tabs.' },
              { title: 'Multi-tab Terminal', body: 'Built on xterm.js and node-pty. Run shells, agents, and dev servers side by side.' },
              { title: 'Built-in Browser', body: 'Preview your running app without switching windows. URL bar, back/forward, and live reload.' },
              { title: 'Dev Server Detection', body: 'Glyph detects your framework and spins up the dev server when you switch to a project.' },
              { title: 'Project Switcher', body: 'Switch between projects in one click. State, terminals, and tabs are all preserved per project.' },
              { title: 'Port Management', body: 'Glyph tracks which ports your projects are using and surfaces them in the sidebar.' },
            ].map(({ title, body }) => (
              <div key={title} className="p-5 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-zinc-100 mb-2">{title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-6 py-24 border-t border-zinc-800/60">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-12">FAQ</p>
          <div className="divide-y divide-zinc-800 max-w-2xl">
            {[
              { q: 'What macOS version is required?', a: 'Glyph requires macOS 13 Ventura or later. Apple Silicon and Intel are both supported.' },
              { q: 'Which AI agents does it work with?', a: 'Any agent that runs in a terminal — Claude Code, Cursor, Aider, Codex CLI, and others.' },
              { q: 'Is it free?', a: 'Yes, free during beta. We\'ll share pricing plans before the full release.' },
            ].map(({ q, a }) => (
              <div key={q} className="py-6">
                <p className="text-sm font-medium text-zinc-100 mb-2">{q}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download CTA */}
      <section id="download" className="px-6 py-24 border-t border-zinc-800/60">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-6">Download</p>
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-100 mb-4">
            Start building with AI agents.
          </h2>
          <p className="text-zinc-400 text-sm mb-8">Free during beta. macOS only.</p>
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-950 text-sm font-medium rounded-md hover:bg-white transition-colors"
          >
            Download Glyph for macOS
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 border-t border-zinc-800/60">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <span className="text-sm font-semibold">Glyph</span>
          <p className="text-xs text-zinc-600">Made for developers who build with AI.</p>
        </div>
      </footer>

    </div>
  )
}
