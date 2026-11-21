import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
/** Mount-once document slots: feature views own their descendants. */
export function mountDocument(container:HTMLElement) {
  const root=createRoot(container);
  flushSync(()=>root.render(<>
    <header className="global-header"><button id="global-search-open" className="ui-action quiet ui-compact">搜索笔记 ⌘K</button></header>
    <div className="app home">
      <aside id="shell"></aside>
      <section className="collection">
        <header>
          <h1 id="view-title">当前重点</h1>
          <label className="ui-field"><span>搜索</span><input
            id="search"
            placeholder="搜索标题与正文…"
            aria-label="搜索笔记" aria-invalid="false"
          /></label>
        </header>
        <div id="library-tools" hidden={true}></div>
        <div id="organize-tools" hidden={true}>
          <div id="organization-react"></div>
          <section aria-labelledby="ai-review-title">
            <h2 id="ai-review-title">3 · 核对已保存的建议</h2>
            <p>建议需逐条确认。历史计划不代表当前承诺；请结合来源判断。</p>
            <div id="ai-results"></div>
            <div className="organization-actions ui-pagination"><button id="ai-results-previous" className="ui-action secondary">上一页建议</button><button id="ai-results-next" className="ui-action secondary">下一页建议</button></div>
          </section>
        </div>

        <div id="action-tools" hidden={true}></div>
        <div id="initiative-tools" hidden={true}></div>
        <p id="index-state" role="status">正在打开目录…</p>
        <div id="items"></div>
      </section>
      <main>
        <section id="workspace-context" aria-label="事项上下文" hidden={true}></section>
        <div id="workspace-detail">
        <div id="empty" className="empty">
          <h2>尚未打开内容</h2>
          <p>从列表选择内容，或使用「新建」开始记录。</p>
        </div>
        <div id="editor" hidden={true}>

        </div>
        <div id="action-editor" hidden={true}></div>
        <div id="initiative-editor" hidden={true}>
          <div className="toolbar"><button className="ui-action quiet" id="initiative-back">‹ 行动与资料</button></div>

        </div>
        </div>
      </main>
    </div>
    <div id="notice" role="status" hidden={true}></div>
    <div
      id="conflict"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflict-heading"
      hidden={true}
    >
    </div>
</>));
}
