export function resolveMotionMode({preference="creative",reduced=false,forcedColors=false,saveData=false,hardwareConcurrency=8}={}){
  if(preference==="off"||reduced)return "off";
  if(forcedColors||saveData||Number(hardwareConcurrency||0)<=4)return "lite";
  return "creative";
}
export const motionPreference=value=>value==="off"?"off":"creative";
