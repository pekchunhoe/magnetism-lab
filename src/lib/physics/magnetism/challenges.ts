import type { Challenge, Params, TabId } from '../../../types/magnetism';
import { coilCentre, magnitude, motorForce, radius, resultant, selectedSpeed, sourceField, wireForce } from './core';
export const near = (actual:number,target:number,tolerance=0.04) => Number.isFinite(actual)&&Math.abs(actual-target)<=Math.max(Math.abs(target)*tolerance,1e-15);
export function createChallenge(tab:TabId,index:number,random=Math.random()): Challenge {
  const target=Math.round(2+random*6), number=index%4;
  const task=(title:string,hint:string,solution:string,check:(p:Params)=>boolean):Challenge=>({title,hint,solution,check});
  const choices: Record<TabId,Challenge[]> = {
    fields:[
      task(`Use a straight wire. Reach ${target*5} µT at the probe.`, 'Move the probe closer, or increase the current.','Use B = μ₀I / (2πr). For 5 A, choose r = 1 / B(µT) metres.',p=>p.source==='wire'&&near(magnitude(sourceField(p,p.probe)),target*5e-6)),
      task(`Set a coil centre field of ${target*100} µT.`, 'Choose Circular coil. Change I, N or R.','Use I = 2RB / (μ₀N). This task checks the theoretical centre field.',p=>p.source==='coil'&&near(Math.abs(coilCentre(p.turns,p.current,p.radius)),target*100e-6)),
      task('Reverse a wire field so it circulates clockwise.','Viewed from the +z side, negative current points into the plane.','Choose Straight wire and set a negative current.',p=>p.source==='wire'&&p.current< -0.1),
      task('Reduce the field at the probe below 5 µT with a bar magnet.','The dipole field decreases strongly with distance.','Choose Bar magnet and drag the probe toward an outer corner.',p=>p.source==='bar'&&magnitude(sourceField(p,p.probe))<5e-6)
    ],
    resultant:[
      task('Find a cancellation point with two nonzero currents.','Equal currents cancel halfway between the wires.','Set equal signed currents and put P at their midpoint.',p=>Math.abs(p.current)>1&&Math.abs(p.current2)>1&&magnitude(resultant(p))<0.15e-6),
      task('Make the fields add at the midpoint.','Reverse one current. Put P midway between the wires.','Use equal and opposite currents; their fields between the wires point the same way.',p=>p.current*p.current2<0&&Math.hypot(p.probe.x-(p.wire1.x+p.wire2.x)/2,p.probe.y-(p.wire1.y+p.wire2.y)/2)<0.01),
      task(`Reach a resultant field of ${target*5} µT at P.`,'Move P closer to one wire.','Use the vector sum; distances and field directions both matter.',p=>near(magnitude(resultant(p)),target*5e-6)),
      task('Make wire A carry twice the current of wire B.','Use the signed current controls.','For example, set wire A to 6 A and wire B to 3 A.',p=>Math.abs(p.current2)>1&&near(p.current,2*p.current2))
    ],
    charges:[
      task(`Make a circular proton orbit of radius ${target*2} cm.`,'Use a 90° launch angle. Adjust speed or field.','Use v = r|q|B / m with a proton and θ = 90°.',p=>p.particle==='proton'&&p.angle===90&&near(radius(p.mass,p.speed,p.charge,p.field),target*0.02)),
      task('Make the magnetic force zero while the particle is moving.','Align velocity with the field.','Set launch angle to 0° or 180° and use a nonzero speed.',p=>p.speed>1000&&(p.angle===0||p.angle===180)),
      task('Produce a helical path with a negative charge.','The velocity needs both parallel and perpendicular components.','Choose Electron or Generic negative, then use a launch angle between 20° and 70°.',p=>p.charge<0&&p.angle>=20&&p.angle<=70&&p.speed>0),
      task('Keep a stationary charge in the field.','Magnetic force requires motion.','Set the speed to zero.',p=>p.speed===0)
    ],
    motor:[
      task(`Reach a force magnitude of ${target*2} mN.`,'Change current, active length or field.','Use I = F / (Bl sin θ). The sign sets direction.',p=>near(Math.abs(motorForce(p)),target*0.002)),
      task('Find maximum angular force at a nonzero current.','The sine term is largest at a right angle.','Set θ = 90° and a nonzero current.',p=>p.angle===90&&Math.abs(p.current)>1),
      task('Make force point in the positive y direction.','Reverse either the current or the field.','For the depicted conductor, positive current and +z field give −y force. Reverse one.',p=>motorForce(p)>0.001),
      task('Make force zero without switching off the current.','Align the wire with the field.','Use θ = 0° or 180° with nonzero current.',p=>Math.abs(p.current)>1&&(p.angle===0||p.angle===180))
    ],
    wires:[
      task(`Make attracting wires exert ${target*10} µN/m.`,'Use currents with the same sign. Reduce separation for greater force.','Use d = μ₀I₁I₂ / (2π F/L).',p=>p.current*p.current2>0&&near(Math.abs(wireForce(p)),target*10e-6)),
      task('Make the wires repel.','The two current directions must oppose.','Use one positive and one negative current.',p=>p.current*p.current2< -1),
      task('Make the wires attract with equal current magnitudes.','Match both the signs and magnitudes.','Set I₁ = I₂, for example +5 A each.',p=>Math.abs(p.current)>1&&near(p.current,p.current2)),
      task('Make the mutual force zero.','One wire must stop producing a magnetic field.','Set either current to zero.',p=>p.current===0||p.current2===0)
    ],
    selector:[
      task(`Select an undeflected beam at ${target*25} km/s.`,'Match E / B to the beam speed.','Set the beam speed to the target, then E = vB.',p=>near(p.speed,target*25000)&&near(p.speed,selectedSpeed(p),0.01)),
      task('Pass a negative charge straight through.','The balance condition works for either charge sign.','Choose a negative particle and set E = vB.',p=>p.charge<0&&p.speed>0&&near(p.speed,selectedSpeed(p),0.01)),
      task('Use the analyser with a balanced positive beam.','Enable the analyser after matching the fields.','Use a positive charge, enable the analyser and set v = E/B.',p=>p.analyser&&p.charge>0&&p.speed>0&&near(p.speed,selectedSpeed(p),0.01)),
      task('Make the electric force dominate for a positive particle.','The beam must enter slower than the selected speed.','Use a positive charge and set v below 0.8 E/B.',p=>p.charge>0&&p.speed>0&&p.speed<0.8*selectedSpeed(p))
    ]
  };
  return choices[tab][number];
}
