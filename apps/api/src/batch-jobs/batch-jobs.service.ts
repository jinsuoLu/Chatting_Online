import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
export type BatchJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export interface BatchJob<T = unknown> { id:string; ownerAdminId:string; status:BatchJobStatus; requested:number; completed:number; failed:number; result?:T; error?:string; createdAt:string; updatedAt:string; }
@Injectable()
export class BatchJobsService {
  private readonly jobs = new Map<string, BatchJob>();
  create(ownerAdminId:string, requested:number): BatchJob { const now=new Date().toISOString(); const job:BatchJob={id:randomUUID(),ownerAdminId,status:'PENDING',requested,completed:0,failed:0,createdAt:now,updatedAt:now};this.jobs.set(job.id,job);return {...job}; }
  get(id:string): BatchJob { const job=this.jobs.get(id);if(!job) throw new NotFoundException({code:'BATCH_JOB_NOT_FOUND',message:'Batch job not found'});return {...job}; }
  start(id:string){this.patch(id,{status:'RUNNING'});} progress(id:string,completed:number,failed:number){this.patch(id,{completed,failed});} complete<T>(id:string,result:T){this.patch(id,{status:'COMPLETED',result,completed:(result as any).succeeded??0,failed:(result as any).failed?.length??0});} fail(id:string,error:unknown){this.patch(id,{status:'FAILED',error:error instanceof Error?error.message:String(error)});}
  private patch(id:string, update:Partial<BatchJob>){const job=this.jobs.get(id);if(job)Object.assign(job,update,{updatedAt:new Date().toISOString()});}
}
