export function focusDirections(index:number, visibleCount:number, hasPrevious:boolean, hasNext:boolean) {
  return [
    ...(index > 0 || hasPrevious ? [-1] : []),
    ...(index < visibleCount - 1 || hasNext ? [1] : [])
  ];
}

export function focusReturnIndex(keys:readonly string[], key:string, previousIndex:number) {
  const match = keys.indexOf(key);
  return match >= 0 ? match : Math.min(previousIndex, keys.length - 1);
}

/** Calculate a bounded reorder without changing identity or rewriting neighbors. */
export function focusPosition(actions:readonly {focusPosition:number}[], index:number, direction:number):number {
  const neighbor=actions[index+direction];
  if(!neighbor || ![-1,1].includes(direction)) throw Error('无法移动此行动。');
  const beyond=actions[index+direction*2];
  const position=beyond?(neighbor.focusPosition+beyond.focusPosition)/2:neighbor.focusPosition+direction;
  if(!Number.isFinite(position)||position===neighbor.focusPosition||position===beyond?.focusPosition) throw Error('重点顺序过于接近，请先移出再加入此行动。');
  return position;
}
