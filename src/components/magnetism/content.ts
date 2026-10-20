import type { TabId, Params } from '../../types/magnetism';
export const TABS:{id:TabId;name:string;short:string;description:string}[]=[
  {id:'fields',name:'Magnetic Fields',short:'Fields',description:'Make the invisible visible. Explore the fields that surround magnets and currents.'},
  {id:'resultant',name:'Resultant Fields',short:'Resultant',description:'Two sources. One field. Discover how magnetic vectors combine in space.'},
  {id:'charges',name:'Moving Charges',short:'Charges',description:'Launch a particle and follow the force that bends its path.'},
  {id:'motor',name:'Motor Effect',short:'Motor',description:'Turn current into motion. Investigate the force on a conductor.'},
  {id:'wires',name:'Parallel Wires',short:'Wires',description:'Explore why currents attract, repel, and exert equal and opposite forces.'},
  {id:'selector',name:'Velocity Selector',short:'Selector',description:'Balance electric and magnetic forces to select a particle’s speed.'}
];
export function theory(tab:TabId,p:Params) {
  if(tab==='fields')switch(p.source){
    case 'wire':return{formula:'B = μ₀I / 2πr',note:'An ideal, long straight wire. Curl your right fingers around the current direction. Within the 2 mm wire core, the field is regularized.'};
    case 'coil':return{formula:'Bcentre = μ₀NI / 2R',note:'A thin circular coil. The probe uses numerical Biot–Savart integration; the formula gives the centre field.'};
    case 'solenoid':return{formula:'Bcentre ≈ μ₀NI / l     Bend ≈ ½Bcentre',note:'The formulas assume a long solenoid. The probe uses a finite-solenoid field with numerical integration off-axis. The scene draws representative turns; the centre/end ratio approaches 2 as length grows.'};
    case 'earth':return{formula:'Bᴴ = Bcoil / tan θ',note:'A uniform local horizontal field of 25 µT. In the guided experiment, the coil and Earth fields are perpendicular.'};
    default:return{formula:'B ∝ 1 / r³',note:'A magnetic dipole approximation outside the bar. Field lines run from N to S outside the magnet. The near-core pattern is illustrative.'};
  }
  return {
    resultant:{formula:'Bnet = B₁ + B₂',note:'Add vectors, including their directions. Equal currents cancel between wires; opposing currents add between wires. Ideal long wires with a 2 mm core.'},
    charges:{formula:'F = |q|vB sin θ     r = mv⊥ / |q|B',note:'Launch angle is relative to B. Reversing B preserves launch velocity and updates this angle. A uniform magnetic field changes direction, not speed. Parallel motion stays straight; oblique motion forms a helix. Motion is shown on a slowed time scale.'},
    motor:{formula:'F = BIl sin θ',note:'Direction follows Iℓ × B. Positive current lies in the x–z plane; +z field gives −y force. Displacement is illustrative, not a mechanical dynamics model.'},
    wires:{formula:'F / L = μ₀I₁I₂ / 2πd',note:'Ideal long, parallel wires. Same current direction attracts; opposite directions repel. Animated displacement is exaggerated; the stated separation sets the calculation.'},
    selector:{formula:'vselected = E / B     ranalyser = mv / |q|B',note:'E is downward (−y) and B is into the page (−z). The physical exit opening is 0.10 mm high (±0.05 mm), centered on the beam axis. Finite-length selectors can transmit off-selected velocities when the trajectory clears the opening. Particles are points; visible spheres are enlarged markers. Fringe fields are neglected.'}
  }[tab];
}
