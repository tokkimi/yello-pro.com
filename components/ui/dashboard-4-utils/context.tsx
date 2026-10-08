'use client';
import {createContext,useContext} from 'react';
import {financialOverview} from '@/lib/financial-overview';
export type DashboardData={stats:ReturnType<typeof financialOverview>;categories:{name:string;amount:number}[];year:number;onExport:()=>void};
export const DashboardContext=createContext<DashboardData|null>(null);
export function useDashboard(){const data=useContext(DashboardContext);if(!data)throw Error('Dashboard data is required');return data}
