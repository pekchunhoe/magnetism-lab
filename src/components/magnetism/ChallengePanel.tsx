import { useEffect, useMemo, useState } from 'react';
import { Flag, Lightbulb, ArrowRight, Check, RefreshCw } from 'lucide-react';
import type { Params, TabId } from '../../types/magnetism';
import { createChallenge } from '../../lib/physics/magnetism/challenges';
export function ChallengePanel({tab,p}:{tab:TabId;p:Params}) {
  const [index,setIndex]=useState(0),[seed,setSeed]=useState(()=>Math.random()),[hint,setHint]=useState(false),[solution,setSolution]=useState(false),[result,setResult]=useState<boolean|null>(null);
  const challenge=useMemo(()=>createChallenge(tab,index,seed),[tab,index,seed]);
  useEffect(()=>setResult(null),[p]);
  return <section className="card challenge-card"><div className="card-heading"><h2><Flag size={16}/>Lab challenge</h2><span className="challenge-count">{index%4+1} / 4</span></div><div className="challenge-body"><span className="eyebrow">PUT IT TO THE TEST</span><h3>{challenge.title}</h3><p className="challenge-tolerance">Numerical targets: 4% tolerance; beam balance: 1%.</p>{hint&&<p className="hint"><Lightbulb size={14}/>{challenge.hint}</p>}{solution&&<p className="hint">{challenge.solution}</p>}{result!==null&&<p role="status" className={result?'success-message':'attempt-message'}>{result?<><Check size={16}/> Nicely done. Target reached.</>:'Keep experimenting. Check the parameters and try again.'}</p>}<div className="button-pair"><button className="primary" onClick={()=>setResult(challenge.check(p))}>Check answer <ArrowRight size={14}/></button><button className="secondary" aria-expanded={hint} onClick={()=>setHint(!hint)}><Lightbulb size={14}/>Hint</button></div><div className="challenge-footer"><button className="text-button" onClick={()=>setSolution(!solution)}>{solution?'Hide solution':'Show solution'}</button><button className="text-button" onClick={()=>{setIndex(i=>i+1);setSeed(Math.random());setHint(false);setSolution(false);setResult(null);}}><RefreshCw size={12}/> Next challenge</button></div></div></section>;
}
