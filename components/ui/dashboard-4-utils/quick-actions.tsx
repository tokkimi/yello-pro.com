'use client';
import {Download,ArrowRight} from 'lucide-react';
import {useDashboard} from './context';
export function QuickActions(){const {onExport}=useDashboard();return <div className="dashboard4-card dashboard4-actions"><div><Download size={18}/><span><strong>Dossier comptable</strong><small>Rapport, factures, dépenses et justificatifs</small></span></div><button type="button" className="btn secondary" onClick={onExport}>Préparer l’export<ArrowRight size={15}/></button></div>}
