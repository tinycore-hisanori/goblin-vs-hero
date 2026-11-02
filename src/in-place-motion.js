// The simulation owns world movement. Meshy walking clips can contain forward
// travel in the hips, which otherwise visibly snaps backwards every loop.
export function inPlaceClip(clip){
 const result=clip.clone();result.name=clip.name+' / in place';
 for(const track of result.tracks){
  if(!/(?:Hips|Root|Armature)\.position$/i.test(track.name))continue;
  const stride=track.getValueSize();if(stride!==3)continue;
  const x=track.values[0],z=track.values[2];
  for(let i=0;i<track.values.length;i+=3){track.values[i]=x;track.values[i+2]=z;}
 }
 return result;
}
