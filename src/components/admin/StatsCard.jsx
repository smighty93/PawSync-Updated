import React from 'react';
import { motion } from 'framer-motion';

export default function StatsCard({ title, value, change, icon: Icon }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="ps-stat-card bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex items-center justify-between"
    >
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
        {change && (
          <p className="text-xs font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <span>↑ {change}</span>
            <span className="text-slate-400 font-normal">vs last month</span>
          </p>
        )}
      </div>
      {Icon && (
        <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
          <Icon className="w-6 h-6" />
        </div>
      )}
    </motion.div>
  );
}