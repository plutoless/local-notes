import {createRoot} from 'react-dom/client';
import {Button} from './components';
import {LibraryRows} from './library';
export function mountLibraryCatalogue(container:HTMLElement) {
  const root=createRoot(container);
  root.render(<><h2>React 笔记库组件</h2><p>实际生产按钮、列表行与语义样式；不访问笔记或保存记录。</p>
    <div className="flex flex-wrap gap-2"><Button className="primary">主要操作</Button><Button className="secondary">保存笔记</Button><Button className="quiet ui-compact">次要操作</Button><Button disabled>暂不可用</Button></div>
    <LibraryRows notes={[{path:'研究/中文长路径.md',title:'这是用于检查长中文标题换行与键盘选中状态的笔记标题',excerpt:'逐字保留来源摘要；生产列表不会在组件内访问存储。',modified:1000}]} directories={[]} selectedPath="研究/中文长路径.md" empty="" root={false} open={()=>{}} browse={()=>{}}/>
  </>);
  return ()=>root.unmount();
}
