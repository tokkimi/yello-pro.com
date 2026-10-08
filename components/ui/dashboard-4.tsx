'use client';
import {CategoryRankChart} from './dashboard-4-utils/category-rank-chart';
import {QuickActions} from './dashboard-4-utils/quick-actions';
import {RefundReturnRateChart} from './dashboard-4-utils/refund-return-rate-chart';
import {RevenueChart} from './dashboard-4-utils/revenue-chart';
import {DashboardStats} from './dashboard-4-utils/stats';
import {DashboardContext,type DashboardData} from './dashboard-4-utils/context';
export function Dashboard({data}:{data:DashboardData}){return <DashboardContext.Provider value={data}><div className="dashboard4-grid"><DashboardStats/><RevenueChart/><RefundReturnRateChart/><CategoryRankChart/><QuickActions/></div></DashboardContext.Provider>}
export default Dashboard;
