import { BarChart3, ArrowUpRight } from "lucide-react";
export default function AnalyticsCard({ title, metrics }) {
  return <section className="ps-analytics-card bg-white rounded-2xl border border-slate-100 p-6">
    <div className="ps-analytics-heading"><span><BarChart3 size={20}/></span><h2>{title}</h2></div>
    <div>{metrics.map((metric, index) => <div key={index} className="ps-analytics-metric"><div><p>{metric.label}</p>{metric.subtext && <small>{metric.subtext}</small>}</div><strong>{metric.value}</strong>{String(metric.value).endsWith("%") && Number.isFinite(parseFloat(metric.value)) && <div className="ps-metric-track" aria-hidden="true"><span style={{width:`${Math.max(0,Math.min(100,parseFloat(metric.value)))}%`}}/></div>}</div>)}</div>
    <p className="ps-analytics-caption"><ArrowUpRight size={14}/> Metrics from your PawSync records</p>
  </section>;
}
