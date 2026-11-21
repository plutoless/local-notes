import {createRoot} from 'react-dom/client';
import {Button} from './components';
import {ConflictComparison, type ConflictRecord, type SyncCallbacks} from './sync';
import {LibraryRows} from './library';
import {ShellContent} from './shell';
import {FocusContent, type FocusCallbacks} from './focus';
export function mountLibraryCatalogue(container:HTMLElement, icon:(name:string)=>string = ()=>'') {
  const root=createRoot(container);
  const noop=()=>{};
  const callbacks:FocusCallbacks={openAction:noop,navigate:noop,createInitiative:noop,openInitiative:noop,recover:noop,remove:noop,move:noop,more:noop,page:noop,waiting:noop,resume:noop,removeReading:noop,status:()=> '待办',overdue:()=>false};
  const revision={revision:'catalogue-revision',description:'逐字保留需要人工核对的长中文来源与行动内容'.repeat(3),status:'todo',modifiedAt:'2026-11-20'};
  const conflict:ConflictRecord={key:'catalogue-conflict',id:'catalogue',type:'action',name:'行动：人工核对来源与版本',versions:[revision,{...revision,revision:'catalogue-other',description:'另一个待核对的完整分支'}],tips:[revision],incomplete:false,cyclic:false,selected:revision.revision,value:revision,json:'{待修正',invalid:true,committed:false,saving:false,message:'JSON 格式无效。请修正后保存，编辑仍保留。',detail:''};
  const syncCallbacks:SyncCallbacks={close:noop,refresh:noop,jump:noop,choose:noop,edit:noop,discard:noop,save:noop,recover:noop};
  root.render(<><h2>React 笔记库组件</h2><p>实际生产按钮、列表行与语义样式；不访问笔记或保存记录。</p>
    <div className="flex flex-wrap gap-2"><Button className="primary">主要操作</Button><Button className="secondary">保存笔记</Button><Button className="quiet ui-compact">次要操作</Button><Button disabled>暂不可用</Button></div>
    <LibraryRows notes={[{path:'研究/中文长路径.md',title:'这是用于检查长中文标题换行与键盘选中状态的笔记标题',excerpt:'逐字保留来源摘要；生产列表不会在组件内访问存储。',modified:1000}]} directories={[]} selectedPath="研究/中文长路径.md" empty="" root={false} open={()=>{}} browse={()=>{}}/>
    <h2>React 导航与当前重点</h2><p>实际生产组件；示例回调不会写入数据。选中与键盘焦点独立。</p>
    <div className="app home"><aside><ShellContent model={{page:'focus',root:'样本笔记/用于检查很长中文目录名称与路径的目录',count:''}} callbacks={{navigate:noop,capture:noop,choose:noop,icon}}/></aside><section className="collection"><FocusContent model={{focused:{actions:[{entityId:'catalogue-focus',description:'这是用于检查中文长描述换行、键盘焦点与管理操作的当前重点行动',status:'todo',focusPosition:1}],hasMore:false},waiting:{actions:[],hasMore:false},initiatives:{actions:[],hasMore:false},recent:[{path:'研究/长中文路径.md',title:'保留原文身份并继续阅读',fingerprint:'demo',scroll:{}}],limit:7,offset:0}} callbacks={callbacks}/></section></div>
    <h2>React 同步版本比较</h2><section className="sync-panel" style={{position:'static',inset:'auto',zIndex:'auto'}}><ConflictComparison record={conflict} callbacks={syncCallbacks}/></section>
  </>);
  return ()=>root.unmount();
}
