import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

export interface FzPronunciationChartProps {
  isMg?: boolean;
  db?: any;
}

// Historical pronunciation trend data over 14 sessions
const baseHistoryData = [
  { day: "J1", date: "Jul 24", overall: 58, frenchR: 45, nasals: 52, vowelY: 48, liaisons: 62 },
  { day: "J2", date: "Jul 25", overall: 61, frenchR: 48, nasals: 55, vowelY: 50, liaisons: 65 },
  { day: "J3", date: "Jul 26", overall: 63, frenchR: 50, nasals: 58, vowelY: 52, liaisons: 68 },
  { day: "J4", date: "Jul 27", overall: 66, frenchR: 55, nasals: 62, vowelY: 56, liaisons: 70 },
  { day: "J5", date: "Jul 28", overall: 68, frenchR: 58, nasals: 65, vowelY: 60, liaisons: 72 },
  { day: "J6", date: "Jul 29", overall: 72, frenchR: 62, nasals: 70, vowelY: 64, liaisons: 75 },
  { day: "J7", date: "Jul 30", overall: 74, frenchR: 66, nasals: 72, vowelY: 68, liaisons: 78 },
  { day: "J8", date: "Jul 31", overall: 77, frenchR: 70, nasals: 75, vowelY: 71, liaisons: 80 },
  { day: "J9", date: "Aug 01", overall: 79, frenchR: 73, nasals: 78, vowelY: 73, liaisons: 82 },
  { day: "J10", date: "Aug 02", overall: 81, frenchR: 75, nasals: 80, vowelY: 76, liaisons: 84 },
  { day: "J11", date: "Aug 03", overall: 83, frenchR: 78, nasals: 82, vowelY: 78, liaisons: 86 },
  { day: "J12", date: "Aug 04", overall: 85, frenchR: 80, nasals: 84, vowelY: 80, liaisons: 88 },
  { day: "J13", date: "Aug 05", overall: 87, frenchR: 83, nasals: 86, vowelY: 82, liaisons: 89 },
  { day: "J14", date: "Aug 06", overall: 89, frenchR: 85, nasals: 88, vowelY: 84, liaisons: 91 }
];

// Radar chart data comparing baseline vs current phoneme accuracy
const phonemeRadarData = [
  { phoneme: "[ʁ] Guttural R", baseline: 45, current: 85, example: "Bonjour, Paris" },
  { phoneme: "[ɑ̃] Nasal AN", baseline: 52, current: 88, example: "Enfant, France" },
  { phoneme: "[ɔ̃] Nasal ON", baseline: 50, current: 82, example: "Bonjour, Maison" },
  { phoneme: "[y] Vowel U", baseline: 48, current: 84, example: "Salut, Musique" },
  { phoneme: "[z] Liaison Z", baseline: 62, current: 91, example: "Les amis" },
  { phoneme: "[œ/ø] EU Vowel", baseline: 55, current: 79, example: "Fleur, Bleu" }
];

export const FzPronunciationChart: React.FC<FzPronunciationChartProps> = ({
  isMg = false
}) => {
  const [activeTab, setActiveTab] = useState<"trend" | "radar" | "breakdown">("trend");
  const [timeframe, setTimeframe] = useState<7 | 14>(14);
  const [selectedPhoneme, setSelectedPhoneme] = useState<string>("all");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Detect dark mode from document element
    const checkDark = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const chartData = baseHistoryData.slice(baseHistoryData.length - timeframe);

  const phonemeKeys = [
    { key: "overall", label: isMg ? "Manontolo (Global)" : "Score Global", color: "#6366f1", icon: "📊" },
    { key: "frenchR", label: "French 'R' [ʁ]", color: "#10b981", icon: "🗣️" },
    { key: "nasals", label: isMg ? "Feo nasal [ɑ̃]/[ɔ̃]" : "Voyelles nasales [ɑ̃]/[ɔ̃]", color: "#f59e0b", icon: "🌬️" },
    { key: "vowelY", label: "Voyelle 'U' [y]", color: "#ec4899", icon: "🎵" },
    { key: "liaisons", label: isMg ? "Fifandraisana [z]" : "Liaisons [z]", color: "#8b5cf6", icon: "🔗" }
  ];

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-xl text-white text-xs space-y-1.5 backdrop-blur-md">
          <div className="font-extrabold text-amber-400 font-mono border-b border-slate-800 pb-1 flex justify-between gap-4">
            <span>{isMg ? `Andro` : `Session`} {label}</span>
            <span className="text-slate-400 text-[10px]">{payload[0]?.payload?.date}</span>
          </div>
          <div className="space-y-1 pt-0.5">
            {payload.map((entry: any, index: number) => {
              const meta = phonemeKeys.find(p => p.key === entry.dataKey);
              return (
                <div key={index} className="flex items-center justify-between gap-4 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span className="text-slate-300">{meta?.label || entry.name}</span>
                  </div>
                  <span className="font-bold text-white">{entry.value}%</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xl shadow-md">
            📈
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base tracking-tight">
                {isMg ? "Fivoaran'ny Fanononana (Analytique Recharts)" : "Tendances de Prononciation (Recharts)"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                IA Evaluation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isMg
                ? "Famoahana ny fivoarana isaky ny phonème amin'ny alalan'ny tabilao Recharts indray mitatao"
                : "Suivez votre progression phonétique détaillée et l'amélioration de vos scores au fil du temps"}
            </p>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
          <button
            onClick={() => setActiveTab("trend")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "trend"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            📊 {isMg ? "Fivoarana (Courbe)" : "Courbe"}
          </button>
          <button
            onClick={() => setActiveTab("radar")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "radar"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            🎯 {isMg ? "Radar Phonème" : "Radar Phonèmes"}
          </button>
          <button
            onClick={() => setActiveTab("breakdown")}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === "breakdown"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            📋 Details
          </button>
        </div>
      </div>

      {/* Quick Summary Stats Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
            {isMg ? "Salan'isa Ankehitriny" : "Score Moyen Actuel"}
          </div>
          <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1.5">
            <span>89%</span>
            <span className="text-[10px] text-emerald-500 font-bold">↑ +31%</span>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
            {isMg ? "Fivoarana Lehibe Indrindra" : "Meilleure Progression"}
          </div>
          <div className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
            <span>🗣️ French R [ʁ]</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">45% → 85% (+40%)</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
            {isMg ? "Point Fort" : "Liaisons & Sounding"}
          </div>
          <div className="text-sm font-black font-mono text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
            <span>🔗 Liaison Z [z]</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">91% {isMg ? "Avo indrindra" : "Excellente précision"}</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-3">
          <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
            {isMg ? "Isan'ny Andramo" : "Sessions Enregistrées"}
          </div>
          <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            14 {isMg ? "Andro" : "Jours"}
          </div>
        </div>
      </div>

      {/* TAB 1: LINE / AREA CHART TRENDS */}
      {activeTab === "trend" && (
        <div className="space-y-3">
          {/* Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            {/* Timeframe selector */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 mr-1">
                {isMg ? "Fandaharam-potoana:" : "Période:"}
              </span>
              <button
                onClick={() => setTimeframe(7)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                  timeframe === 7
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                7 {isMg ? "Andro" : "Jours"}
              </button>
              <button
                onClick={() => setTimeframe(14)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                  timeframe === 14
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                14 {isMg ? "Andro" : "Jours"}
              </button>
            </div>

            {/* Phoneme series filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedPhoneme("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                  selectedPhoneme === "all"
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                🌟 {isMg ? "Izy Rehetra" : "Tous"}
              </button>
              {phonemeKeys.map(p => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPhoneme(p.key)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all flex items-center gap-1 ${
                    selectedPhoneme === p.key
                      ? "ring-2 ring-indigo-500 shadow-2xs bg-white dark:bg-slate-800"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100"
                  }`}
                  style={{ color: selectedPhoneme === p.key ? p.color : undefined }}
                >
                  <span>{p.icon}</span>
                  <span>{p.key === "overall" ? "Global" : p.key}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Area / Line Chart Canvas */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOverall" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFrenchR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e2e8f0"} opacity={0.6} />
                <XAxis dataKey="day" stroke={isDarkMode ? "#94a3b8" : "#64748b"} fontSize={11} fontFamily="monospace" />
                <YAxis domain={[30, 100]} stroke={isDarkMode ? "#94a3b8" : "#64748b"} fontSize={11} fontFamily="monospace" unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: "8px", fontSize: "11px", fontFamily: "sans-serif" }} />

                {(selectedPhoneme === "all" || selectedPhoneme === "overall") && (
                  <Area
                    type="monotone"
                    dataKey="overall"
                    name={isMg ? "Global (%)" : "Score Global (%)"}
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorOverall)"
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {(selectedPhoneme === "all" || selectedPhoneme === "frenchR") && (
                  <Line
                    type="monotone"
                    dataKey="frenchR"
                    name="French 'R' [ʁ]"
                    stroke="#10b981"
                    strokeWidth={selectedPhoneme === "frenchR" ? 3.5 : 2}
                    dot={{ r: 3, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {(selectedPhoneme === "all" || selectedPhoneme === "nasals") && (
                  <Line
                    type="monotone"
                    dataKey="nasals"
                    name={isMg ? "Nasales [ɑ̃]/[ɔ̃]" : "Nasales [ɑ̃]/[ɔ̃]"}
                    stroke="#f59e0b"
                    strokeWidth={selectedPhoneme === "nasals" ? 3.5 : 2}
                    dot={{ r: 3, fill: "#f59e0b" }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {(selectedPhoneme === "all" || selectedPhoneme === "vowelY") && (
                  <Line
                    type="monotone"
                    dataKey="vowelY"
                    name="Voyelle 'U' [y]"
                    stroke="#ec4899"
                    strokeWidth={selectedPhoneme === "vowelY" ? 3.5 : 2}
                    dot={{ r: 3, fill: "#ec4899" }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {(selectedPhoneme === "all" || selectedPhoneme === "liaisons") && (
                  <Line
                    type="monotone"
                    dataKey="liaisons"
                    name="Liaisons [z]"
                    stroke="#8b5cf6"
                    strokeWidth={selectedPhoneme === "liaisons" ? 3.5 : 2}
                    dot={{ r: 3, fill: "#8b5cf6" }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 2: RADAR CHART */}
      {activeTab === "radar" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-mono text-slate-600 dark:text-slate-300">
            <span>🎯 {isMg ? "Aharana ny feo fototra (Lambo voalohany vs Ankehitriny)" : "Comparaison Niveau Initial (Début) vs Maîtrise Actuelle"}</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> {isMg ? "Voalohany" : "Initial"}</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> {isMg ? "Ankehitriny" : "Actuel"}</span>
            </div>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={phonemeRadarData}>
                <PolarGrid stroke={isDarkMode ? "#334155" : "#cbd5e1"} />
                <PolarAngleAxis
                  dataKey="phoneme"
                  stroke={isDarkMode ? "#cbd5e1" : "#475569"}
                  fontSize={11}
                  fontFamily="sans-serif"
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke={isDarkMode ? "#64748b" : "#94a3b8"} fontSize={10} />
                <Radar
                  name={isMg ? "Lambo Voalohany" : "Niveau Initial"}
                  dataKey="baseline"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.25}
                />
                <Radar
                  name={isMg ? "Maîtrise Ankehitriny" : "Maîtrise Actuelle"}
                  dataKey="current"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.45}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 3: BREAKDOWN CARDS */}
      {activeTab === "breakdown" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {phonemeRadarData.map((item, idx) => {
            const diff = item.current - item.baseline;
            return (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-3.5 space-y-2 hover:border-indigo-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 font-mono">{item.phoneme}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    +{diff}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>{isMg ? "Ohatra" : "Exemple"}: <strong className="text-slate-700 dark:text-slate-200 italic">"{item.example}"</strong></span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{item.current}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500"
                    style={{ width: `${item.current}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
