import React, { useState } from 'react';

// --- ICONS ---
const ChartIcons = {
    Bar: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
    ),
    Line: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>
        </svg>
    ),
    Spline: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M4 17c3-6 6-2 9-8s5-2 8-6"/>
        </svg>
    ),
    ChevronLeft: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
        </svg>
    ),
    ChevronRight: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
        </svg>
    ),
    Flashcard: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
    ),
    Trophy: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
    ),
    Swords: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/>
        </svg>
    ),
    Gamepad: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/>
        </svg>
    ),
    Kanji: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <text x="4" y="18" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none">字</text>
        </svg>
    )
};

// --- COLOR MAP ---
const COLORS = {
    cyan: { bar: '#06b6d4', bg: 'from-cyan-500 to-cyan-600' },
    purple: { bar: '#a855f7', bg: 'from-purple-500 to-purple-600' },
    orange: { bar: '#f97316', bg: 'from-orange-500 to-orange-600' },
    green: { bar: '#22c55e', bg: 'from-green-500 to-green-600' }
};

// --- BAR CHART COMPONENT ---
const BarChart = ({ data, dataKey, color, unit }) => {
    const values = data.map(d => d[dataKey] || 0);
    const maxValue = Math.max(...values);
    
    // Y-axis: lấy max thực tế, tối thiểu 5 để có grid đẹp
    const yMax = maxValue > 0 ? maxValue : 5;
    const ySteps = 10;
    const stepValue = Math.ceil(yMax / ySteps) || 1;
    const yAxisMax = stepValue * ySteps;
    
    const barColor = COLORS[color]?.bar || '#06b6d4';

    return (
        <div className="h-full flex flex-col">
            {/* Chart Row */}
            <div className="flex-1 flex min-h-0">
                {/* Y-Axis */}
                <div className="relative pr-2 text-right w-12 shrink-0">
                    {[...Array(ySteps + 1)].map((_, i) => (
                        <span 
                            key={i} 
                            className="absolute right-2 text-sm text-gray-600 font-bold -translate-y-1/2 whitespace-nowrap"
                            style={{ top: `${(i / ySteps) * 100}%` }}
                        >
                            {yAxisMax - stepValue * i}
                        </span>
                    ))}
                </div>

                {/* Bars Container */}
                <div className="flex-1 relative border-l-2 border-b-2 border-gray-300 bg-white">
                    {/* Grid Lines - Horizontal (at each Y-axis value) */}
                    {[...Array(ySteps + 1)].map((_, i) => (
                        <div 
                            key={`h-${i}`} 
                            className="absolute left-0 right-0 border-t border-gray-200" 
                            style={{ top: `${(i / ySteps) * 100}%` }} 
                        />
                    ))}
                    
                    {/* Grid Lines - Vertical */}
                    {data.map((_, idx) => (
                        <div 
                            key={`v-${idx}`} 
                            className="absolute top-0 bottom-0 border-l border-gray-100" 
                            style={{ left: `${((idx + 1) / data.length) * 100}%` }} 
                        />
                    ))}

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end">
                        {data.map((item, idx) => {
                            const value = item[dataKey] || 0;
                            const heightPercent = yAxisMax > 0 ? (value / yAxisMax) * 100 : 0;

                            return (
                                <div 
                                    key={idx} 
                                    className="flex-1 flex justify-center items-end h-full group relative"
                                    style={{ padding: '0 1px' }}
                                >
                                    {/* Value label on top - shows on hover */}
                                    {value > 0 && (
                                        <div 
                                            className="absolute left-1/2 -translate-x-1/2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none"
                                            style={{ 
                                                bottom: `calc(${Math.max(heightPercent, 2)}% + 4px)`,
                                                color: barColor
                                            }}
                                        >
                                            {value}
                                        </div>
                                    )}

                                    {/* Bar */}
                                    <div
                                        className="w-full max-w-[20px] rounded-t transition-all duration-300 cursor-pointer relative overflow-hidden hover:brightness-110"
                                        style={{
                                            height: value > 0 ? `${Math.max(heightPercent, 2)}%` : '0',
                                            backgroundColor: value > 0 ? barColor : 'transparent',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* X-Axis Row */}
            <div className="flex h-10 shrink-0">
                <div className="w-12 shrink-0" /> {/* Spacer for Y-axis */}
                <div className="flex-1 flex border-l-2 border-gray-300 bg-white">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-center min-w-0 px-px">
                            <span className={`text-sm font-bold leading-tight ${
                                item.isToday
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-sm'
                                    : item.isWeekend
                                        ? 'text-red-400'
                                        : 'text-gray-600'
                            }`}>
                                {item.day}
                            </span>
                            <span className={`text-[10px] font-medium leading-tight ${item.isWeekend ? 'text-red-300' : 'text-gray-400'}`}>
                                {item.dayName}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- LINE CHART COMPONENT ---
const LineChart = ({ data, dataKey, color, unit }) => {
    const values = data.map(d => d[dataKey] || 0);
    const maxValue = Math.max(...values);
    
    const yMax = maxValue > 0 ? maxValue : 5;
    const ySteps = 10;
    const stepValue = Math.ceil(yMax / ySteps) || 1;
    const yAxisMax = stepValue * ySteps;
    
    const lineColor = COLORS[color]?.bar || '#06b6d4';

    // Build points string for polyline (using viewBox coordinates)
    const buildPointsString = () => {
        return data.map((item, idx) => {
            const value = item[dataKey] || 0;
            const x = ((idx + 0.5) / data.length) * 100;
            const y = 100 - (yAxisMax > 0 ? (value / yAxisMax) * 100 : 0);
            return `${x},${y}`;
        }).join(' ');
    };

    return (
        <div className="h-full flex flex-col">
            {/* Chart Row */}
            <div className="flex-1 flex min-h-0">
                {/* Y-Axis */}
                <div className="relative pr-2 text-right w-12 shrink-0">
                    {[...Array(ySteps + 1)].map((_, i) => (
                        <span 
                            key={i} 
                            className="absolute right-2 text-sm text-gray-600 font-bold -translate-y-1/2 whitespace-nowrap"
                            style={{ top: `${(i / ySteps) * 100}%` }}
                        >
                            {yAxisMax - stepValue * i}
                        </span>
                    ))}
                </div>

                {/* Line Container */}
                <div className="flex-1 relative border-l-2 border-b-2 border-gray-300 bg-white">
                    {/* Grid Lines - Horizontal (at each Y-axis value) */}
                    {[...Array(ySteps + 1)].map((_, i) => (
                        <div 
                            key={`h-${i}`} 
                            className="absolute left-0 right-0 border-t border-gray-200" 
                            style={{ top: `${(i / ySteps) * 100}%` }} 
                        />
                    ))}
                    
                    {/* Grid Lines - Vertical */}
                    {data.map((_, idx) => (
                        <div 
                            key={`v-${idx}`} 
                            className="absolute top-0 bottom-0 border-l border-gray-100" 
                            style={{ left: `${((idx + 1) / data.length) * 100}%` }} 
                        />
                    ))}

                    {/* SVG Line with viewBox */}
                    <svg 
                        className="absolute inset-0 w-full h-full overflow-visible" 
                        viewBox="0 0 100 100" 
                        preserveAspectRatio="none"
                    >
                        {/* Line Path */}
                        <polyline
                            fill="none"
                            stroke={lineColor}
                            strokeWidth="0.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            style={{ strokeWidth: '2.5px' }}
                            points={buildPointsString()}
                        />
                    </svg>
                    
                    {/* Data Points (separate SVG for correct circle sizing) */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                        {data.map((item, idx) => {
                            const value = item[dataKey] || 0;
                            const x = ((idx + 0.5) / data.length) * 100;
                            const y = 100 - (yAxisMax > 0 ? (value / yAxisMax) * 100 : 0);
                            
                            return (
                                <g key={idx} className="group cursor-pointer">
                                    <circle
                                        cx={`${x}%`}
                                        cy={`${y}%`}
                                        r="5"
                                        fill="white"
                                        stroke={lineColor}
                                        strokeWidth="2.5"
                                        className="transition-all hover:scale-125"
                                    />
                                    <title>{item.day}/{item.month}: {value} {unit}</title>
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* X-Axis Row */}
            <div className="flex h-10 shrink-0">
                <div className="w-12 shrink-0" /> {/* Spacer for Y-axis */}
                <div className="flex-1 flex border-l-2 border-gray-300 bg-white">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-center min-w-0 px-px">
                            <span className={`text-sm font-bold leading-tight ${
                                item.isToday
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-sm'
                                    : item.isWeekend
                                        ? 'text-red-400'
                                        : 'text-gray-600'
                            }`}>
                                {item.day}
                            </span>
                            <span className={`text-[10px] font-medium leading-tight ${item.isWeekend ? 'text-red-300' : 'text-gray-400'}`}>
                                {item.dayName}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- SPLINE CHART COMPONENT (Smooth Curve) ---
const SplineChart = ({ data, dataKey, color, unit }) => {
    const values = data.map(d => d[dataKey] || 0);
    const maxValue = Math.max(...values);
    
    const yMax = maxValue > 0 ? maxValue : 5;
    const ySteps = 10;
    const stepValue = Math.ceil(yMax / ySteps) || 1;
    const yAxisMax = stepValue * ySteps;
    
    const splineColor = COLORS[color]?.bar || '#06b6d4';

    // Build smooth curve path using Catmull-Rom to Bezier conversion
    const buildSplinePath = () => {
        const points = data.map((item, idx) => {
            const value = item[dataKey] || 0;
            const x = ((idx + 0.5) / data.length) * 100;
            const y = 100 - (yAxisMax > 0 ? (value / yAxisMax) * 100 : 0);
            return { x, y };
        });
        
        if (points.length < 2) return '';
        
        // Simple smooth curve using quadratic bezier
        let path = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            
            // Control point at midpoint
            const cpX = (current.x + next.x) / 2;
            
            // Use S command for smooth continuation
            if (i === 0) {
                path += ` Q ${cpX} ${current.y}, ${cpX} ${(current.y + next.y) / 2}`;
            }
            path += ` T ${next.x} ${next.y}`;
        }
        
        return path;
    };

    // Build filled area path
    const buildAreaPath = () => {
        const points = data.map((item, idx) => {
            const value = item[dataKey] || 0;
            const x = ((idx + 0.5) / data.length) * 100;
            const y = 100 - (yAxisMax > 0 ? (value / yAxisMax) * 100 : 0);
            return { x, y };
        });
        
        if (points.length < 2) return '';
        
        // Start from bottom-left
        let path = `M ${points[0].x} 100 L ${points[0].x} ${points[0].y}`;
        
        // Smooth curve through points
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const cpX = (current.x + next.x) / 2;
            
            if (i === 0) {
                path += ` Q ${cpX} ${current.y}, ${cpX} ${(current.y + next.y) / 2}`;
            }
            path += ` T ${next.x} ${next.y}`;
        }
        
        // Close path to bottom
        path += ` L ${points[points.length - 1].x} 100 Z`;
        
        return path;
    };

    return (
        <div className="h-full flex flex-col">
            {/* Chart Row */}
            <div className="flex-1 flex min-h-0">
                {/* Y-Axis */}
                <div className="relative pr-2 text-right w-12 shrink-0">
                    {[...Array(ySteps + 1)].map((_, i) => (
                        <span 
                            key={i} 
                            className="absolute right-2 text-sm text-gray-600 font-bold -translate-y-1/2 whitespace-nowrap"
                            style={{ top: `${(i / ySteps) * 100}%` }}
                        >
                            {yAxisMax - stepValue * i}
                        </span>
                    ))}
                </div>

                {/* Spline Container */}
                <div className="flex-1 relative border-l-2 border-b-2 border-gray-300 bg-white">
                    {/* Grid Lines - Horizontal */}
                    {[...Array(ySteps + 1)].map((_, i) => (
                        <div 
                            key={`h-${i}`} 
                            className="absolute left-0 right-0 border-t border-gray-200" 
                            style={{ top: `${(i / ySteps) * 100}%` }} 
                        />
                    ))}
                    
                    {/* Grid Lines - Vertical */}
                    {data.map((_, idx) => (
                        <div 
                            key={`v-${idx}`} 
                            className="absolute top-0 bottom-0 border-l border-gray-100" 
                            style={{ left: `${((idx + 1) / data.length) * 100}%` }} 
                        />
                    ))}

                    {/* SVG Spline */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={`splineGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={splineColor} stopOpacity="0.3"/>
                                <stop offset="100%" stopColor={splineColor} stopOpacity="0.02"/>
                            </linearGradient>
                        </defs>
                        
                        {/* Filled Area */}
                        <path
                            d={buildAreaPath()}
                            fill={`url(#splineGrad-${color})`}
                        />
                        
                        {/* Smooth Curve Line */}
                        <path
                            d={buildSplinePath()}
                            fill="none"
                            stroke={splineColor}
                            strokeWidth="0.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            style={{ strokeWidth: '3px' }}
                        />
                    </svg>
                    
                    {/* Data Points */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                        {data.map((item, idx) => {
                            const value = item[dataKey] || 0;
                            const x = ((idx + 0.5) / data.length) * 100;
                            const y = 100 - (yAxisMax > 0 ? (value / yAxisMax) * 100 : 0);
                            
                            return (
                                <g key={idx} className="group cursor-pointer">
                                    <circle
                                        cx={`${x}%`}
                                        cy={`${y}%`}
                                        r="4"
                                        fill="white"
                                        stroke={splineColor}
                                        strokeWidth="2"
                                        className="transition-all hover:r-6"
                                    />
                                    {value > 0 && (
                                        <title>{item.day}/{item.month}: {value} {unit}</title>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>

            {/* X-Axis Row */}
            <div className="flex h-10 shrink-0">
                <div className="w-12 shrink-0" /> {/* Spacer for Y-axis */}
                <div className="flex-1 flex border-l-2 border-gray-300 bg-white">
                    {data.map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-center min-w-0 px-px">
                            <span className={`text-sm font-bold leading-tight ${
                                item.isToday
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center shadow-sm'
                                    : item.isWeekend
                                        ? 'text-red-400'
                                        : 'text-gray-600'
                            }`}>
                                {item.day}
                            </span>
                            <span className={`text-[10px] font-medium leading-tight ${item.isWeekend ? 'text-red-300' : 'text-gray-400'}`}>
                                {item.dayName}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN CHART WRAPPER ---
const StatisticsChart = ({
    data,
    monthlyTotals,
    selectedMonth,
    selectedYear,
    isCurrentMonth,
    onPrevMonth,
    onNextMonth,
    getMonthName,
    language
}) => {
    const [activeTab, setActiveTab] = useState('flashcards');
    const [chartType, setChartType] = useState('bar');

    const tabs = [
        { key: 'rankPoints', label: 'Rank Đấu', color: 'orange', icon: <ChartIcons.Gamepad />, total: monthlyTotals.rankPoints, unit: 'pts' },
        { key: 'kanjiLearned', label: 'Sức mạnh', color: 'cyan', icon: <ChartIcons.Kanji />, total: monthlyTotals.kanjiLearned, unit: 'Hán tự' },
        { key: 'challengeScore', label: 'Chiến công', color: 'purple', icon: <ChartIcons.Swords />, total: monthlyTotals.challengeScore, unit: 'điểm' }
    ];

    const currentTab = tabs.find(t => t.key === activeTab) || tabs[0];

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header - Month Selector */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
                <button 
                    onClick={onPrevMonth} 
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <ChartIcons.ChevronLeft />
                </button>
                <div className="text-center">
                    <div className="text-xl font-black uppercase tracking-wider">
                        {getMonthName(selectedMonth, selectedYear, language)}
                    </div>
                    <div className="text-sm text-cyan-300 mt-1 font-semibold">
                        Tổng: {currentTab.total} {currentTab.unit}
                    </div>
                </div>
                <button 
                    onClick={onNextMonth} 
                    disabled={isCurrentMonth} 
                    className={`p-2 rounded-lg transition-colors ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'}`}
                >
                    <ChartIcons.ChevronRight />
                </button>
            </div>

            {/* Data Type Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-bold transition-all border-b-2 ${
                            activeTab === tab.key
                                ? 'bg-white text-slate-800 border-slate-800'
                                : 'text-slate-400 hover:text-slate-600 border-transparent hover:bg-white/50'
                        }`}
                    >
                        <span className={activeTab === tab.key ? '' : 'opacity-50'}>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-50/50 border-b border-gray-100">
                <span className="text-sm text-gray-600 font-semibold">Kiểu:</span>
                {[
                    { key: 'bar', icon: <ChartIcons.Bar />, label: 'Cột' },
                    { key: 'line', icon: <ChartIcons.Line />, label: 'Đường' },
                    { key: 'spline', icon: <ChartIcons.Spline />, label: 'Cong' }
                ].map((type) => (
                    <button
                        key={type.key}
                        onClick={() => setChartType(type.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            chartType === type.key
                                ? 'bg-slate-800 text-white shadow'
                                : 'bg-white text-slate-500 hover:bg-slate-100 border border-gray-200'
                        }`}
                    >
                        {type.icon}
                        <span>{type.label}</span>
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="p-3 h-[520px]">
                {data.length > 0 && chartType === 'bar' && (
                    <BarChart
                        data={data}
                        dataKey={activeTab}
                        color={currentTab.color}
                        unit={currentTab.unit}
                    />
                )}
                {data.length > 0 && chartType === 'line' && (
                    <LineChart
                        data={data}
                        dataKey={activeTab}
                        color={currentTab.color}
                        unit={currentTab.unit}
                    />
                )}
                {data.length > 0 && chartType === 'spline' && (
                    <SplineChart
                        data={data}
                        dataKey={activeTab}
                        color={currentTab.color}
                        unit={currentTab.unit}
                    />
                )}
            </div>

            {/* Footer Note */}
            <div className="px-4 py-4 bg-gray-50 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-600 font-medium flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="3" width="22" height="18" rx="3" fill="url(#footerGrad)" />
                        <rect x="4" y="12" width="3" height="6" rx="1" fill="white" opacity="0.9"/>
                        <rect x="8.5" y="8" width="3" height="10" rx="1" fill="white" opacity="0.95"/>
                        <rect x="13" y="10" width="3" height="8" rx="1" fill="white" opacity="0.9"/>
                        <rect x="17.5" y="6" width="3" height="12" rx="1" fill="white"/>
                        <defs>
                            <linearGradient id="footerGrad" x1="1" y1="3" x2="23" y2="21" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#06B6D4"/>
                                <stop offset="1" stopColor="#0891B2"/>
                            </linearGradient>
                        </defs>
                    </svg>
                    Biểu đồ hiển thị số lượng học được trong từng ngày
                </p>
            </div>
        </div>
    );
};

export default StatisticsChart;
