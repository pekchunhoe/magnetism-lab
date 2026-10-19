import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MagnetismLab } from './MagnetismLab';
afterEach(cleanup);
describe('complete laboratory',()=>{
  it('completes one selector particle, keeps the endpoint, and replays with the chosen parameters',()=>{
    render(<MagnetismLab/>);fireEvent.click(screen.getByRole('tab',{name:'Velocity Selector'}));
    fireEvent.change(screen.getByRole('spinbutton',{name:'Particle speed value'}),{target:{value:'200'}});
    const state=()=>document.querySelector('[data-particle="selector"]')!;
    for(let i=0;i<45;i++)fireEvent.click(screen.getByRole('button',{name:'Step simulation forward'}));
    expect(state()).toHaveAttribute('data-complete','true');
    const endpoint=state().getAttribute('data-position'),time=state().getAttribute('data-time');
    fireEvent.click(screen.getByRole('button',{name:'Step simulation forward'}));
    expect(state()).toHaveAttribute('data-position',endpoint);expect(state()).toHaveAttribute('data-time',time);
    fireEvent.click(screen.getByRole('button',{name:'Replay particle'}));
    expect(state()).toHaveAttribute('data-time','0');expect(state()).toHaveAttribute('data-complete','false');
    expect(state()).toHaveAttribute('data-trail-count','2');expect(screen.getByRole('spinbutton',{name:'Particle speed value'})).toHaveValue(200);
    fireEvent.click(screen.getByRole('button',{name:'Pause simulation'}));
    fireEvent.click(screen.getByRole('button',{name:'Reset experiment'}));
    expect(screen.getByRole('spinbutton',{name:'Particle speed value'})).toHaveValue(100);
    expect(screen.getByRole('button',{name:'Play simulation'})).toBeInTheDocument();
  },15000); // This regression executes a complete 45-step UI flight.
  it('selector parameter edits restart at the source and clear the trail, preserving pause and step',()=>{
    render(<MagnetismLab/>);fireEvent.click(screen.getByRole('tab',{name:'Velocity Selector'}));
    fireEvent.click(screen.getByRole('button',{name:'2D'}));
    const state=()=>document.querySelector('[data-particle="selector"]')!;
    for(const [name,value] of [['Particle speed value','200'],['Magnetic field value','100'],['Electric field value','15']] as const){
      fireEvent.click(screen.getByRole('button',{name:'Step simulation forward'}));
      expect(Number(state().getAttribute('data-time'))).toBeGreaterThan(0);
      fireEvent.change(screen.getByRole('spinbutton',{name}),{target:{value}});
      expect(state()).toHaveAttribute('data-time','0');
      expect(JSON.parse(state().getAttribute('data-position')!)).toEqual({x:-.28,y:0,z:0});
      expect(state()).toHaveAttribute('data-trail-count','2');
      expect(screen.getByRole('button',{name:'Play simulation'})).toBeInTheDocument();
    }
    for(const particle of ['electron','positive','negative','proton']){
      fireEvent.click(screen.getByRole('button',{name:'Step simulation forward'}));
      fireEvent.change(screen.getByRole('combobox',{name:'Particle'}),{target:{value:particle}});
      expect(state()).toHaveAttribute('data-time','0');
    }
    fireEvent.change(screen.getByRole('combobox',{name:'Particle'}),{target:{value:'positive'}});
    for(const [name,value] of [['Particle mass value','20'],['Charge value','2']] as const){
      fireEvent.click(screen.getByRole('button',{name:'Step simulation forward'}));
      fireEvent.change(screen.getByRole('spinbutton',{name}),{target:{value}});
      expect(state()).toHaveAttribute('data-time','0');expect(state()).toHaveAttribute('data-trail-count','2');
    }
  });
  it('blurring the displayed generic-ion mass preserves its full SI precision and paused flight',()=>{
    render(<MagnetismLab/>);fireEvent.click(screen.getByRole('tab',{name:'Velocity Selector'}));
    fireEvent.change(screen.getByRole('combobox',{name:'Particle'}),{target:{value:'positive'}});
    fireEvent.click(screen.getByRole('button',{name:'Step simulation forward'}));
    const state=()=>document.querySelector('[data-particle="selector"]')!,before=state().getAttribute('data-time');
    const mass=screen.getByRole('spinbutton',{name:'Particle mass value'});
    fireEvent.focus(mass);fireEvent.blur(mass);
    expect(state()).toHaveAttribute('data-time',before);
  });
  it('offers six working tabs with scenes, graphs, measurements, and challenges',()=>{render(<MagnetismLab/>);const tabs=screen.getAllByRole('tab');expect(tabs).toHaveLength(6);for(const tab of tabs){fireEvent.click(tab);expect(tab).toHaveAttribute('aria-selected','true');expect(screen.getByRole('heading',{name:'Interactive scene'})).toBeInTheDocument();expect(screen.getByRole('heading',{name:'Live graph'})).toBeInTheDocument();expect(screen.getByRole('button',{name:/Check answer/})).toBeInTheDocument();expect(screen.getByRole('button',{name:/Record reading/})).toBeInTheDocument();}});
  it('preserves tab state and resets only the active experiment',()=>{render(<MagnetismLab/>);fireEvent.click(screen.getByRole('tab',{name:'Motor Effect'}));fireEvent.change(screen.getByRole('spinbutton',{name:'Conductor current value'}),{target:{value:'8'}});fireEvent.click(screen.getByRole('tab',{name:'Moving Charges'}));fireEvent.click(screen.getByRole('tab',{name:'Motor Effect'}));expect(screen.getByRole('spinbutton',{name:'Conductor current value'})).toHaveValue(8);fireEvent.click(screen.getByRole('button',{name:'Reset experiment'}));expect(screen.getByRole('spinbutton',{name:'Conductor current value'})).toHaveValue(5);});
  it('switches dimensions, records and clears measurements',()=>{render(<MagnetismLab/>);fireEvent.click(screen.getByRole('button',{name:'2D'}));expect(screen.getByRole('button',{name:'2D'})).toHaveAttribute('aria-pressed','true');fireEvent.click(screen.getByRole('button',{name:'Record reading'}));expect(screen.getByText('1 / 12 readings')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Clear measurements'}));expect(screen.getByText('0 / 12 readings')).toBeInTheDocument();});
  it('supports keyboard navigation between tabs and moving a probe',()=>{render(<MagnetismLab/>);fireEvent.keyDown(screen.getByRole('tab',{name:'Magnetic Fields'}),{key:'ArrowRight'});expect(screen.getByRole('tab',{name:'Resultant Fields'})).toHaveAttribute('aria-selected','true');const probe=screen.getByRole('slider',{name:'Observation point P'});fireEvent.keyDown(probe,{key:'ArrowRight'});expect(probe).toHaveAttribute('aria-valuenow','0.185');});
  it('has no prohibited curriculum labels in student text',()=>{render(<MagnetismLab/>);for(const tab of screen.getAllByRole('tab')){fireEvent.click(tab);expect(document.body.textContent).not.toMatch(/SP025|semester|syllabus|subtopic|chapter\s+\d|topic\s+\d/i);}});
  it('navigates relative to the focused tab even when another tab is selected',()=>{render(<MagnetismLab/>);fireEvent.click(screen.getByRole('tab',{name:'Velocity Selector'}));fireEvent.keyDown(screen.getByRole('tab',{name:'Magnetic Fields'}),{key:'ArrowRight'});expect(screen.getByRole('tab',{name:'Resultant Fields'})).toHaveAttribute('aria-selected','true');});
  it('clears successful challenge feedback when a parameter changes',()=>{render(<MagnetismLab/>);fireEvent.click(screen.getByRole('tab',{name:'Motor Effect'}));fireEvent.click(screen.getByRole('button',{name:'Next challenge'}));fireEvent.click(screen.getByRole('button',{name:'Check answer'}));expect(screen.getByRole('status')).toHaveTextContent('Target reached');fireEvent.change(screen.getByRole('spinbutton',{name:'Angle to field value'}),{target:{value:'30'}});expect(screen.queryByRole('status')).toBeNull();});
});
