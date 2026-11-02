const paths={
 salve:'<path d="M15 25h42v24H15Zm12-8h18v40H27Z"/><path d="m16 26 40 22m-40-8 25-14"/>',
 stone:'<path d="m18 30 10-14 21 4 9 19-16 19-23-9Z"/><path d="m19 31 20 3 10-14M39 34l3 24"/>',
 disguise:'<path d="m12 22 24 8 24-8-5 28-19 12-19-12Z"/><path d="m8 15 14 10m42-10L50 25M23 39l8 3m10 0 8-3m-20 9 7 3 7-3"/>',
 decoy:'<circle cx="36" cy="15" r="8"/><path d="M36 23v36M12 30h48M36 40 20 63m16-23 16 23M25 28l-3 18 28 0-3-18"/>',

 potion:'<path d="M27 12h18v10l9 13v22c0 7-36 7-36 0V35l9-13Z"/><path d="M18 42c12-8 24 8 36 0v15c0 7-36 7-36 0Z" fill="currentColor" opacity=".28"/><path d="M25 12h22M27 20h18M36 36v17m-8-9h16"/>',
 ring:'<ellipse cx="36" cy="43" rx="19" ry="20"/><ellipse cx="36" cy="44" rx="12" ry="13"/><path d="m36 8 12 12-12 14-12-14Z" fill="currentColor" opacity=".24"/><path d="m36 8 12 12-12 14-12-14Zm-12 12h24M36 8v26"/>',
 soul:'<path d="m46 6 4 18-24 29-8-7 24-29Zm-30 36 18 16m-10-5-9 10-5-5 9-10"/><path d="M48 9c12 7 13 18 5 23M39 35c13 0 17 10 9 18" opacity=".65"/>',
 boots:'<path d="m29 12 25 4-5 24 11 12v9H22l-7-7 10-15Zm-4 27 24 1M22 54h38M30 22l20 3M29 31l19 2"/><path d="M7 28h13M5 38h12M8 48h6"/>',
 bomb:'<circle cx="35" cy="44" r="20"/><path d="m29 25 5-9 11 4-1 9M40 17l5-9 9 3m-1-7 3-3m1 9h7M27 33l17 20m-1-21L27 53"/>',
 shield:'<path d="m36 9 24 9v20c0 14-24 26-24 26S12 52 12 38V18Zm0 9 16 6v14c0 9-16 18-16 18s-16-9-16-18V24Z"/><path d="m36 27 5 9-5 10-5-10Z" fill="currentColor"/>',
 blade:'<path d="m20 43 29-29 8 8-29 29Zm-8 4 21 15M22 54l-9 10m28-51 9-9M8 25l13-6m-5-8 4 10"/><path d="m39 42 23 5-13 15-22-5Z" fill="currentColor" opacity=".2"/>'
};
export function itemIcon(id){return `<svg viewBox="0 0 72 72" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id]||paths.shield}</svg>`;}
export const slotTypes=[['RECOVERY','生命をつなぐ'],['TACTICAL','道を切り拓く'],['COMBAT','危険に備える']];
export function equipmentCard(item,index,pending=false){const [label,sub]=slotTypes[index];return `<span class="slot-index">0${index+1}<span>${label}</span></span><div class="reel-window"><div class="item-aura"></div><div class="item-symbol ${item.id}">${itemIcon(item.id)}</div></div><div class="item-copy"><span class="item-kind">${pending?'未鑑定の装備':item.charges<0?'常時発動 / PASSIVE':'消耗品 / CONSUMABLE'}</span><h3>${pending?'未知の装備':item.name}</h3><p>${pending?sub:item.detail}</p></div><span class="card-bottom">${pending?'AWAITING THE DRAW':item.charges<0?'◆ 自動装備':`◆ ${item.charges}回使用可能`}</span>`;}
