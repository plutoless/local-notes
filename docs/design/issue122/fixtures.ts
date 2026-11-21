// Entirely synthetic; no workspace files are read. All directions share this object.
export const notes = [
 {id:'demo-01', title:'把零散信息变成可以再次使用的知识：一次阅读与整理的练习', path:'示例资料/阅读与整理/方法.md', tag:'知识管理', date:'11月18日', excerpt:'先保留上下文，再决定怎样组织。阅读与行动不必发生在同一时刻。'},
 {id:'demo-02', title:'会议记录',path:'示例资料/研究/会议记录.md',tag:'研究',date:'11月17日',excerpt:'比较两种检索方式，记录可验证的证据。'},
 {id:'demo-03', title:'会议记录',path:'示例资料/写作/会议记录.md',tag:'写作',date:'11月16日',excerpt:'同名记录依靠路径区分，不猜测它们是否相同。'},
 {id:'demo-04', title:'离线阅读：表格、代码与长段落的排版观察',path:'示例资料/阅读与整理/排版.md',tag:'知识管理',date:'11月15日',excerpt:'在短窗口中保持文字可读，让操作留在可以到达的位置。'},
 {id:'demo-05', title:'早期调研归档',path:'示例资料/归档/调研.md',tag:'已归档',date:'10月12日',excerpt:'保留原始记录，避免把历史计划当成当前承诺。'}
] as const;
export const paragraphs = [
 '阅读的价值常常出现在下一次需要它的时候。与其立即为每一段文字建立复杂的分类，不如先留下原始出处、问题和判断依据。这样再次打开笔记时，我们仍然知道这段话回答了什么。',
 '整理并不意味着把所有内容都转成行动。参考资料可以保持参考资料的身份；只有明确决定要做的事情才成为行动。保留不确定性，比给每条信息一个过早的结论更有帮助。',
 '这是一组虚构的阅读样本。长标题、重复名称和多层路径用来观察界面如何承载真实的信息密度。内容本身不会写入任何工作区，也不会被发送到外部服务。'
];
export const code = 'const context = {\n  source: "示例资料/阅读与整理/方法.md",\n  decision: "保留原文，稍后复用"\n};\nconsole.log(context.source);';
export const searchEntries = [
 ...notes.map((note,index)=>({...note,kind:'note' as const,sourceIndex:index})),
 {id:'demo-initiative',title:'建立可复用的阅读资料',path:'示例事项/阅读资料',tag:'事项',date:'11月18日',excerpt:'为研究保留原始出处和判断依据。',kind:'initiative' as const,sourceIndex:0},
 {id:'demo-action',title:'整理阅读提纲',path:'示例行动/阅读提纲',tag:'行动',date:'11月18日',excerpt:'从阅读笔记中选出需要再次核对的证据。',kind:'action' as const,sourceIndex:0}
];
