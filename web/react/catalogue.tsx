import {InitiativeRows, InitiativeLinks, InitiativeDecisions} from './initiatives';
import {ActionRows} from './actions';
import {createRoot} from 'react-dom/client';
import {OrganizationContent, OrganizationSettings, type OrganizationModel, type OrganizationCallbacks} from './organization';
import {NoteFields,Classification} from './note-forms';
import {SearchContent} from './search';
import {Button} from './components';
import {CandidateReviewContent} from './candidate-review';
import {ConflictComparison, type ConflictRecord, type SyncCallbacks} from './sync';
import {ReferenceDesk} from './reader';
import {LeaveContent} from './overlays';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {LibraryRows} from './library';
import {ShellContent} from './shell';
import {FocusContent, type FocusCallbacks} from './focus';
export function mountLibraryCatalogue(container:HTMLElement, icon:(name:string)=>string = ()=>'') {
  const root=createRoot(container);
  const noop=()=>{};
  const callbacks:FocusCallbacks={openAction:noop,navigate:noop,createInitiative:noop,openInitiative:noop,recover:noop,remove:noop,move:noop,more:noop,page:noop,waiting:noop,resume:noop,removeReading:noop,status:()=> '待办',overdue:()=>false};
  const organization:OrganizationModel={search:'',directory:'*',directories:['研究/长中文目录'],notes:[{path:'研究/中文长路径.md',title:'这是用于核对来源身份与长中文标题的实际生产选择行'}],selected:['研究/中文长路径.md'],inventory:'本页 1 篇。来自当前本机索引。',retry:false,previous:false,next:false,running:false,previewing:false,configured:false,covered:0,batches:[],request:'',status:'选择已更新，请重新预览后发送。',statusState:'idle',service:'尚未配置服务。',address:'',model:'',token:'',savedCredential:false,settingsPending:false,settingsError:'请填写服务地址与模型。'};
  const organizationCallbacks:OrganizationCallbacks={search:noop,directory:noop,select:noop,page:noop,retry:noop,preview:noop,send:noop,cancel:noop,configure:noop,setting:noop,save:noop};
  const revision={revision:'catalogue-revision',description:'逐字保留需要人工核对的长中文来源与行动内容'.repeat(3),status:'todo',modifiedAt:'2026-11-20'};
  const conflict:ConflictRecord={key:'catalogue-conflict',id:'catalogue',type:'action',name:'行动：人工核对来源与版本',versions:[revision,{...revision,revision:'catalogue-other',description:'另一个待核对的完整分支'}],tips:[revision],incomplete:false,cyclic:false,selected:revision.revision,value:revision,json:'{待修正',invalid:true,committed:false,saving:false,message:'JSON 格式无效。请修正后保存，编辑仍保留。',detail:''};
  const syncCallbacks:SyncCallbacks={close:noop,refresh:noop,jump:noop,choose:noop,edit:noop,discard:noop,save:noop,recover:noop};
  root.render(<><h2>React 笔记库组件</h2><p>实际生产按钮、列表行与语义样式；不访问笔记或保存记录。</p>
    <div className="flex flex-wrap gap-2"><Button className="primary">主要操作</Button><Button className="secondary">保存笔记</Button><Button className="quiet ui-compact">次要操作</Button><Button disabled>暂不可用</Button></div>
    <h2>阅读来源与离开决定</h2><ReferenceDesk path="研究/同名资料/中文长路径.md" hidden={false} collapse={noop} organize={noop}/>
    <label>笔记标题<Input aria-label="示例笔记标题" defaultValue="明确编辑与阅读"/></label><label>Markdown 正文<Textarea aria-label="示例笔记正文" defaultValue="## 保留原文"/></label>
    <LeaveContent model={{label:'笔记',failure:'保存失败，编辑仍保留。',committed:false}} choose={noop}/>
    <LibraryRows notes={[{path:'研究/中文长路径.md',title:'这是用于检查长中文标题换行与键盘选中状态的笔记标题',excerpt:'逐字保留来源摘要；生产列表不会在组件内访问存储。',modified:1000}]} directories={[]} selectedPath="研究/中文长路径.md" empty="" root={false} open={()=>{}} browse={()=>{}}/>
    <h2>React 随手记、位置与主题归类</h2><section className="ui-drawer-body"><NoteFields fields={[{id:'catalogue-capture',label:'标题',value:'这是用于检查很长中文标题、输入位置与选择保留的真实表单组件'},{id:'catalogue-location',label:'笔记相对路径',value:'研究/很长的中文目录/资料.md',help:'以 .md 结尾，路径相对于笔记目录。'},{id:'catalogue-topic',label:'主题名称',invalid:true,help:'请填写主题名称。'}]}/><Classification kind="topic" items={[{id:'example',title:'跨目录研究资料归类与长中文内容',checked:true}]} create={noop} change={noop}/></section>
    <h2>React 行动组件</h2><ActionRows rows={[{entityId:'catalogue-action',description:'这是用于检查很长中文行动描述换行与键盘选中状态的下一步',status:'waiting',dueDate:'2020-01-01',waitingOn:'等待对方确认完整的材料与研究方案',sources:[],overdue:true,initiativeName:'独立行动'}]} selected="catalogue-action" empty="" open={noop}/>
    <h2>React 导航与当前重点</h2><p>实际生产组件；示例回调不会写入数据。选中与键盘焦点独立。</p>
    <div className="app home"><aside><ShellContent model={{page:'focus',root:'样本笔记/用于检查很长中文目录名称与路径的目录',count:''}} callbacks={{navigate:noop,capture:noop,choose:noop,icon}}/></aside><section className="collection"><FocusContent model={{focused:{actions:[{entityId:'catalogue-focus',description:'这是用于检查中文长描述换行、键盘焦点与管理操作的当前重点行动',status:'todo',focusPosition:1}],hasMore:false},waiting:{actions:[{entityId:'catalogue-waiting',description:'等待确认资料范围',status:'waiting',waitingOn:'等待对方回复',focusPosition:null}],hasMore:false},initiatives:{actions:[{entityId:'catalogue-current',title:'核对研究资料',progress:'已整理目录，下一步核对来源。'}],hasMore:false},recent:[{path:'研究/长中文路径.md',title:'保留原文身份并继续阅读',fingerprint:'demo',scroll:{}}],limit:7,offset:0}} callbacks={callbacks}/></section></div>
    <h2>React 整理来源与设置</h2><OrganizationContent model={organization} callbacks={organizationCallbacks}/><OrganizationSettings model={organization} callbacks={organizationCallbacks}/>
    <h2>React 建议证据审核</h2><CandidateReviewContent model={{busy:false,destinations:[{entityId:'example',title:'已有的长期研究事项'}],cards:[{record:{entityId:'catalogue-candidate',workspaceId:'synthetic',revision:'example',description:'逐条核对历史计划与长中文证据后再明确确认下一步'.repeat(3),candidateType:'action',placement:'独立行动',reasoning:'原文提到核对资料，未确认当前承诺。',relevance:'当前适用性无法确认',sources:[{path:'研究/长中文来源.md',quote:'- [ ] 历史计划仅供核对，不会自动转成行动',start:0,end:30,fingerprint:'synthetic-fingerprint',fragmentId:'synthetic'}]},description:'',target:'example',dirty:true,disclosures:{'确认前编辑建议':true}}]}} callbacks={{activate:noop,edit:noop,target:noop,disclosure:noop,source:noop,decide:noop,recover:noop}}/>
    <h2>React 同步版本比较</h2><section className="sync-panel" style={{position:'static',inset:'auto',zIndex:'auto'}}><ConflictComparison record={conflict} callbacks={syncCallbacks}/></section>

    <h2>React 事项上下文</h2><InitiativeRows records={[{entityId:'catalogue-initiative',revision:'example',workspaceId:'synthetic',title:'长期中文事项目标与进展以及下一步安排'.repeat(6),goal:'核对原文',progress:'进行中',status:'active',sources:[]}]} selected="catalogue-initiative" empty="" open={noop}/><InitiativeLinks sources={[{path:'研究/长中文参考资料.md',quote:'逐字保留原文',fingerprint:'example',role:'reference'}]} selected="研究/长中文参考资料.md" open={noop}/><InitiativeDecisions choices={[{action:{...revision,entityId:'example',workspaceId:'synthetic',focusPosition:null,sources:[]},value:''}]} targets={[]}/>
    <h2>React 全局搜索</h2><section className="search-dialog ui-panel" aria-label="搜索组件示例"><SearchContent model={{scope:'note',selected:'catalogue-search',status:'本页 1 条结果',previous:false,next:false,rows:[{note:{identity:'catalogue-search',workspaceId:'synthetic',type:'note',path:'研究/中文长路径.md',passageStart:1,fingerprint:'synthetic',entityId:'研究/中文长路径.md',title:'核对长期事项与资料来源的完整中文标题以及下一步行动安排'.repeat(3),contextLabel:'研究/中文长路径.md · 1',passage:'保留来源片段与只读任务标记 - [ ] 核对资料',locator:'研究/中文长路径.md'},query:'来源',text:'保留来源片段与只读任务标记 - [ ] 核对资料'}]}} callbacks={{scope:noop,close:noop,page:noop,refresh:noop,expand:noop,copy:noop,open:noop}}/></section>
  </>);
  return ()=>root.unmount();
}
