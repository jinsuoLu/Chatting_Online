'use client';
import React from 'react';
import {useEffect,useState} from 'react';
export async function api(path:string,init:RequestInit={}){const response=await fetch('/api/v1'+path,{...init,credentials:'include',headers:{'Content-Type':'application/json',...(init.headers||{})}});if(response.status===401){window.location.assign('/login');throw new Error('AUTH_REQUIRED')}if(response.status===403)throw new Error('FORBIDDEN');const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error?.message||body?.message||`HTTP_${response.status}`);return body}
export function Shell({title,children}:{title:string;children:React.ReactNode}){return <div className="shell"><aside><b>Chatting Online</b><nav><a href="/admin/dashboard">概览</a><a href="/admin/rooms">聊天室</a><a href="/admin/access-links">访问链接</a><a href="/admin/audit-logs">审计日志</a><a href="/super-admin/admins">超级管理员</a></nav></aside><main className="content"><header><h1>{title}</h1><span className="muted">管理员控制台</span></header>{children}</main></div>}
export function State({loading,error,empty}:{loading?:boolean;error?:string;empty?:boolean}){if(loading)return <div className="state">加载中…</div>;if(error)return <div role="alert" className="state error">{error==='FORBIDDEN'?'无权限访问':error}</div>;if(empty)return <div className="state">暂无数据</div>;return null}
export function Stat({label,value}:{label:string;value:React.ReactNode}){return <section className="stat"><span>{label}</span><strong>{value}</strong></section>}

