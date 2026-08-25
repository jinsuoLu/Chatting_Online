import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import Rooms from './page';
const push=vi.fn();
vi.mock('next/navigation',()=>({useRouter:()=>({push})}));
beforeEach(()=>{vi.clearAllMocks();global.fetch=vi.fn().mockResolvedValue({status:200,ok:true,json:()=>Promise.resolve([{id:'r1',name:'设计讨论',status:'ACTIVE',expiresAt:null}])}) as any;});
describe('admin room management',()=>{it('loads and filters rooms',async()=>{render(<Rooms/>);expect(await screen.findByText('设计讨论')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('搜索聊天室'),{target:{value:'不存在'}});await waitFor(()=>expect(screen.getByText('暂无数据')).toBeInTheDocument())});it('confirms delete and calls API',async()=>{render(<Rooms/>);await screen.findByText('设计讨论');vi.spyOn(window,'confirm').mockReturnValue(true);fireEvent.click(screen.getByText('删除'));await waitFor(()=>expect(fetch).toHaveBeenCalledWith('/api/v1/rooms/r1',{credentials:'include',headers:{'Content-Type':'application/json'},method:'DELETE'}))});it('redirects on 401',async()=>{(fetch as any).mockResolvedValueOnce({status:401,ok:false,json:()=>Promise.resolve({})});render(<Rooms/>);await waitFor(()=>expect(window.location.assign).toBeDefined())})});

