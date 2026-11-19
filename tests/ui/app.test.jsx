import React from 'react';
import { beforeAll,afterEach,describe,it,expect } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor } from '@testing-library/react';
import App from '../../src/app/App.jsx';
beforeAll(()=>{window.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});});
afterEach(cleanup);
describe('command deck',()=>{
 it('renders 40 independently interactive board tiles',()=>{render(<App/>);expect(screen.getByTestId('game-board').querySelectorAll('[data-tile]')).toHaveLength(40);expect(screen.getByRole('button',{name:'Roll dice'})).toBeEnabled();});
 it('opens and closes settings',async()=>{render(<App/>);fireEvent.click(screen.getByLabelText('Open settings'));await waitFor(()=>expect(screen.getByRole('dialog')).toBeVisible());expect(screen.getByText('Reduce motion')).toBeVisible();fireEvent.click(screen.getByLabelText('Close dialog'));});
 it('shows a real character and match setup',async()=>{render(<App/>);fireEvent.click(screen.getAllByRole('button',{name:'New game'})[0]);await waitFor(()=>expect(screen.getByRole('dialog')).toBeVisible());expect(screen.getByLabelText('Select Darth Vader')).toBeVisible();expect(screen.getByRole('button',{name:'Launch conquest'})).toBeVisible();fireEvent.click(screen.getByLabelText('Close dialog'));});
 it('discloses unconfigured multiplayer instead of fabricating rooms',async()=>{render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Find a game'}));await waitFor(()=>expect(screen.getByText(/No Supabase project is connected yet/)).toBeVisible());fireEvent.click(screen.getByLabelText('Close dialog'));});
});
