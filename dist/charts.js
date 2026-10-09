const CATEGORY_COLORS = {
  'Вода':'#46A6E8','Фрукты':'#EC655B','Овощи':'#54A96B','Сладости':'#E9BC35',
  'Готовая еда':'#5476BD','Напитки':'#ED9864','База':'#B49C7A',
  'Снеки':'#BE854B','Аптека':'#9B7BC0','Товары для дома':'#65ABA6','Услуги Лавки':'#ABB3C0'
};

// At each monthly anchor, slots are contiguous and largest spending is on top.
// The same cubic interpolation as curveBumpX connects category boundaries.
function spendingStacks(rows, monthKeys, productMap) {
  const names=[...new Set(rows.map(r=>productMap.get(r[2]).category))].sort();
  return monthKeys.map(month=>{
    const sums=new Map(names.map(c=>[c,0]));
    for(const r of rows) if(r[1].startsWith(month)) sums.set(productMap.get(r[2]).category,sums.get(productMap.get(r[2]).category)+r[6]);
    let cumulative=0;
    const bands=[...sums].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0],'ru')).map(([category,amount])=>{
      const low=cumulative; cumulative+=amount;
      return {category,amount,low,high:cumulative};
    });
    return {month,total:cumulative,bands};
  });
}
function bumpPath(points,move=true){
  if(!points.length)return '';
  let d=(move?'M':'L')+points[0].join(' ');
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],mid=(a[0]+b[0])/2;
    d+=` C${mid} ${a[1]} ${mid} ${b[1]} ${b[0]} ${b[1]}`;
  }
  return d;
}
function niceMaximum(value,integer=false){
  if(value<=0)return integer?2:1;
  const step=10**Math.floor(Math.log10(value));
  let max=[1,2,3,4,5,6,8,10].map(n=>n*step).find(n=>n>=value*1.04)||10*step;
  return integer?Math.max(2,Math.ceil(max/2)*2):max;
}
function chart(key,title,unit){
  const isSpend=key==='spend',W=innerWidth<600?340:1040,H=isSpend?218:110;
  const left=40,right=10,top=8,bottom=H-25,step=(W-left-right)/24;
  const vals=series.map(s=>s[key]),max=niceMaximum(Math.max(0,...vals.filter(v=>v!==null)),key==='orders');
  const x=i=>left+step*(i+.5),y=v=>bottom-v/max*(bottom-top);
  let svg=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title} по месяцам">`;
  for(const t of [0,.5,1]){
    const value=max*t,yy=y(value);
    svg+=`<line x1="${left}" x2="${W-right}" y1="${yy}" y2="${yy}" stroke="#edf0f5"/><text x="${left-7}" y="${yy+4}" text-anchor="end" fill="#7a8598" font-size="11">${isSpend&&value>=1000?fmt(value/1000,1)+'к':fmt(value,key==='orders'?0:1)}</text>`;
  }
  if(isSpend){
    const stacks=spendingStacks(scoped,currentMonths,P);
    const names=[...new Set(scoped.map(r=>P.get(r[2]).category))].sort();
    for(const name of names){
      const points=stacks.map((s,i)=>({x:x(i),...s.bands.find(b=>b.category===name)}));
      const upper=points.map(p=>[p.x,y(p.high)]),lower=points.map(p=>[p.x,y(p.low)]).reverse();
      svg+=`<path class="category-ribbon" data-ribbon="${esc(name)}" d="${bumpPath(upper)}${bumpPath(lower,false)}Z" fill="${CATEGORY_COLORS[name]}" fill-opacity=".9"><title>${esc(name)}</title></path>`;
    }
    svg+=`<path d="${bumpPath(stacks.map((s,i)=>[x(i),y(s.total)]))}" fill="none" stroke="#45536B" stroke-width="1.3"/>`;
  }else{
    let prev=null;
    vals.forEach((v,i)=>{
      if(v===null){prev=null;return}
      if(prev)svg+=`<path class="metric-line" d="M${prev[0]} ${prev[1]}L${x(i)} ${y(v)}" stroke="#265cff" stroke-width="2" fill="none"/>`;
      svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="#265cff"/>`;
      prev=[x(i),y(v)];
    });
  }
  vals.forEach((v,i)=>{
    if(i%(innerWidth<600?6:3)===0||i===23){const [yr,mo]=currentMonths[i].split('-');svg+=`<text x="${x(i)}" y="${H-6}" text-anchor="middle" font-size="11" fill="#788499">${mo}.${yr.slice(2)}</text>`}
    svg+=`<rect data-month="${i}" data-metric="${key}" tabindex="0" aria-label="${monthLabel(currentMonths[i])}: ${v===null?'нет покупок':fmt(v,1)+' '+unit}" x="${left+i*step}" y="0" width="${step}" height="${bottom+4}" fill="transparent"/>`;
  });
  return `<div class="metric-chart ${isSpend?'spending-chart':''}"><div class="chart-label">${title}${unit?`,&nbsp;${unit}`:''}</div><div class="chart-surface">${svg}</svg></div></div>`;
}
