"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import QRCodeStyling, { DotType, CornerSquareType, CornerDotType } from "qr-code-styling";
import { Download, Link2, Scan, Palette, Image as ImageIcon, Wifi, Mail, CheckCircle2, LayoutTemplate, History, AlertCircle, RotateCcw, User, FileCode, QrCode, Trash2, Copy, Check, ArrowUpDown, Plus, ArrowLeft } from "lucide-react";

// --- Helper Functions for WCAG Contrast Calculation ---
const getRGB = (c: string) => {
  let hex = c.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
};
const getLuminance = (r: number, g: number, b: number) => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};
const calculateContrast = (hex1: string, hex2: string) => {
  const rgb1 = getRGB(hex1);
  const rgb2 = getRGB(hex2);
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (lightest + 0.05) / (darkest + 0.05);
};

export default function QRGeneratorPro() {
  // Tabs & Data
  const [activeTab, setActiveTab] = useState("url");
  const [url, setUrl] = useState("");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiEncryption, setWifiEncryption] = useState("WPA");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [vcardFName, setVcardFName] = useState("");
  const [vcardLName, setVcardLName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardCompany, setVcardCompany] = useState("");
  const [vcardJob, setVcardJob] = useState("");

  // Appearance Settings
  const [fgColor, setFgColor] = useState("#4F46E5");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [logo, setLogo] = useState<string | null>(null);
  const [qrStyle, setQrStyle] = useState<DotType>("square");
  
  // Cohesive Palettes
  const presetFgColors = [
    { name: "Indigo", hex: "#4F46E5" },
    { name: "Violet", hex: "#7C3AED" },
    { name: "Pink", hex: "#DB2777" },
    { name: "Emerald", hex: "#059669" },
    { name: "Orange", hex: "#EA580C" }
  ];
  const presetBgColors = [
    { name: "Pure White", hex: "#FFFFFF" },
    { name: "Soft Indigo", hex: "#EEF2FF" },
    { name: "Soft Emerald", hex: "#ECFDF5" },
    { name: "Soft Pink", hex: "#FDF2F8" },
    { name: "Deep Navy", hex: "#0F172A" }
  ];
  
  // States & Refs
  const [downloadState, setDownloadState] = useState<"idle" | "png" | "svg">("idle");
  const [history, setHistory] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  
  const qrRef = useRef<HTMLDivElement>(null);
  const qrCodeInstance = useRef<QRCodeStyling | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem("qr_pro_history");
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  const validationError = useMemo(() => {
    if (activeTab === "url") {
      if (!url.trim()) return "Target URL is required.";
      if (!url.includes(".")) return "Please enter a valid URL.";
    }
    if (activeTab === "wifi" && !wifiSsid.trim()) return "Network Name (SSID) is required.";
    if (activeTab === "email") {
      if (!emailTo.trim()) return "Recipient email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo)) return "Please enter a valid email address.";
    }
    if (activeTab === "vcard") {
      if (!vcardFName.trim()) return "First Name is required.";
      if (!vcardPhone.trim()) return "Phone Number is required.";
    }
    return "";
  }, [activeTab, url, wifiSsid, emailTo, vcardFName, vcardPhone]);

  const getQRValue = () => {
    if (activeTab === "url") return url || "https://example.com";
    if (activeTab === "wifi") return `WIFI:T:${wifiEncryption};S:${wifiSsid};P:${wifiPassword};H:false;;`;
    if (activeTab === "email") return `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    if (activeTab === "vcard") {
      return `BEGIN:VCARD\nVERSION:3.0\nN:${vcardLName};${vcardFName};;;\nFN:${vcardFName} ${vcardLName}\nORG:${vcardCompany}\nTITLE:${vcardJob}\nTEL;TYPE=WORK,VOICE:${vcardPhone}\nEND:VCARD`;
    }
    return "https://example.com";
  };

  const isEmptyState = (activeTab === "url" && !url) || (activeTab === "wifi" && !wifiSsid) || (activeTab === "email" && !emailTo) || (activeTab === "vcard" && !vcardFName);
  
  const contrastRatio = useMemo(() => calculateContrast(fgColor, bgColor), [fgColor, bgColor]);

  useEffect(() => {
    if (isEmptyState || validationError) return;
    setIsGenerating(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const qrOptions = {
        width: 280,
        height: 280,
        type: "canvas" as const,
        data: getQRValue(),
        image: logo || undefined,
        dotsOptions: { color: fgColor, type: qrStyle },
        backgroundOptions: { color: bgColor },
        imageOptions: { crossOrigin: "anonymous", margin: 5, imageSize: 0.4 },
                // 🔥 Vercel TypeScript Fix: Added 'as CornerSquareType'
        cornersSquareOptions: {
          type: (
            qrStyle === "dots" ? "dot" :
            qrStyle === "rounded" ? "extra-rounded" :
            "square"
          ) as CornerSquareType,
          color: fgColor
        },
        cornersDotOptions: {
          type: (
            qrStyle === "dots" ? "dot" :
            qrStyle === "rounded" ? "dot" :
            "square"
          ) as CornerDotType,
          color: fgColor
        }
      };

      if (!qrCodeInstance.current) {
        qrCodeInstance.current = new QRCodeStyling(qrOptions);
        if (qrRef.current) {
          qrRef.current.innerHTML = "";
          qrCodeInstance.current.append(qrRef.current);
        }
      } else {
        qrCodeInstance.current.update(qrOptions);
      }
      setIsGenerating(false);
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url, wifiSsid, wifiPassword, wifiEncryption, emailTo, emailSubject, emailBody, vcardFName, vcardLName, vcardPhone, vcardCompany, vcardJob, activeTab, fgColor, bgColor, logo, qrStyle, validationError]);
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogo(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const downloadQR = async (extension: "png" | "svg") => {
    if (validationError || !qrCodeInstance.current || isEmptyState) return;
    setDownloadState(extension);

    await qrCodeInstance.current.download({ name: `QR_${activeTab.toUpperCase()}_HighRes`, extension });

    const canvas = qrRef.current?.querySelector("canvas");
    const thumbnail = canvas ? canvas.toDataURL("image/png") : null;

    const newItem = {
      id: Date.now(),
      tab: activeTab,
      title: activeTab === "url" ? url : activeTab === "wifi" ? wifiSsid : activeTab === "email" ? emailTo : `${vcardFName} ${vcardLName}`,
      date: new Date().toLocaleDateString(),
      image: thumbnail,
      rawData: getQRValue()
    };
    
    const newHistory = [newItem, ...history].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem("qr_pro_history", JSON.stringify(newHistory));

    setTimeout(() => setDownloadState("idle"), 2500);
  };

  const restoreHistoryItem = (item: any) => {
    setActiveTab(item.tab);
    if (item.tab === "url") setUrl(item.title);
    if (item.tab === "wifi") setWifiSsid(item.title);
    if (item.tab === "email") setEmailTo(item.title);
    if (item.tab === "vcard") setVcardFName(item.title.split(" ")[0]);
  };

  const deleteHistoryItem = (id: number) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem("qr_pro_history", JSON.stringify(newHistory));
  };

  const copyToClipboard = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderHistoryIcon = (tab: string) => {
    const iconClass = "w-3 h-3 absolute -bottom-1 -right-1 bg-[#111827] text-gray-300 rounded-full p-0.5 border border-gray-800";
    switch(tab) {
      case 'url': return <Link2 className={iconClass} />;
      case 'wifi': return <Wifi className={iconClass} />;
      case 'email': return <Mail className={iconClass} />;
      case 'vcard': return <User className={iconClass} />;
      default: return <Scan className={iconClass} />;
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-body { font-family: 'Inter', sans-serif; }
        
        .skeleton-pulse {
          background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%);
          background-size: 200% 100%;
          animation: pulse-shimmer 1.5s ease-in-out infinite;
        }
        @keyframes pulse-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <div className="min-h-screen bg-[#0B0F19] text-gray-300 flex justify-center p-4 md:p-8 font-body selection:bg-indigo-500/30">
        <div className="max-w-[1200px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Side: Controls */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4 uppercase tracking-wider">
                <Scan className="w-3.5 h-3.5" /> Advanced QR Engine
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 font-display tracking-tight">
                Create <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Dynamic</span> QR Codes.
              </h1>
            </div>

            {/* Content Tabs */}
            <div className="bg-[#111827] rounded-xl p-1.5 border border-gray-800/60 inline-flex w-full md:w-fit overflow-x-auto">
              {[
                { id: 'url', icon: Link2, label: 'Link' },
                { id: 'wifi', icon: Wifi, label: 'Wi-Fi' },
                { id: 'email', icon: Mail, label: 'Email' },
                { id: 'vcard', icon: User, label: 'vCard' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setLogo(null); }}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 whitespace-nowrap active:scale-95 ${activeTab === tab.id ? "bg-[#1F2937] text-white shadow-md shadow-black/20" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Inputs Section */}
            <div className="bg-[#111827] p-6 md:p-8 rounded-2xl border border-gray-800/60 shadow-xl relative transition-all group-focus-within:border-gray-600/50">
              {activeTab === "url" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 transition-colors">Target URL</label>
                  <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className={`w-full bg-[#0B0F19] border ${validationError && url ? 'border-red-500/50' : 'border-gray-700 hover:border-gray-600 focus:border-indigo-500'} text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner`} placeholder="https://example.com" />
                </div>
              )}
              {activeTab === "wifi" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Network Name (SSID)</label>
                    <input type="text" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="My_WiFi_Network" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Password</label>
                      <input type="password" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Security</label>
                      <select value={wifiEncryption} onChange={(e) => setWifiEncryption(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner appearance-none">
                        <option value="WPA">WPA/WPA2</option>
                        <option value="WEP">WEP</option>
                        <option value="nopass">None</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "email" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Recipient Email</label>
                    <input type="email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="hello@company.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Subject</label>
                    <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="Meeting inquiry" />
                  </div>
                </div>
              )}
              {activeTab === "vcard" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">First Name</label>
                      <input type="text" value={vcardFName} onChange={(e) => setVcardFName(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="Ahmed" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Last Name</label>
                      <input type="text" value={vcardLName} onChange={(e) => setVcardLName(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="Sobhy" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Phone Number</label>
                    <input type="tel" value={vcardPhone} onChange={(e) => setVcardPhone(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="+20 100 000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Company</label>
                      <input type="text" value={vcardCompany} onChange={(e) => setVcardCompany(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="Tech Solutions" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Job Title</label>
                      <input type="text" value={vcardJob} onChange={(e) => setVcardJob(e.target.value)} className="w-full bg-[#0B0F19] border border-gray-700 hover:border-gray-600 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-300 shadow-inner" placeholder="Software Engineer" />
                    </div>
                  </div>
                </div>
              )}

              {validationError && !isEmptyState && (
                <div className="absolute -bottom-5 left-6 flex items-center gap-1.5 text-red-400 text-xs font-medium animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5" /> {validationError}
                </div>
              )}
            </div>

            {/* Design & Branding Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800/60 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-gray-700/60">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-200 mb-6"><Palette className="w-4 h-4 text-indigo-400" /> Brand Colors</h3>
                
                <div className="flex flex-col">
                  {/* Foreground Section */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-300">Foreground</span>
                      <div className="text-xs text-gray-400 bg-[#0B0F19] px-3 py-1.5 rounded-lg border border-gray-700/60 uppercase tracking-wider font-mono">
                        {fgColor}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {presetFgColors.map(color => (
                        <button 
                          key={color.hex} 
                          onClick={() => setFgColor(color.hex)} 
                          className={`relative group w-8 h-8 rounded-full transition-all duration-200 ${fgColor.toUpperCase() === color.hex.toUpperCase() ? 'ring-2 ring-[#4F46E5] ring-offset-[3px] ring-offset-[#111827]' : 'hover:scale-110'}`} 
                          style={{ backgroundColor: color.hex }} 
                        >
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            {color.name}
                          </div>
                        </button>
                      ))}
                      <label className="w-8 h-8 rounded-full border border-gray-600 border-dashed flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all ml-1">
                        <Plus className="w-4 h-4 text-gray-400" />
                        <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="sr-only" />
                      </label>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-center py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-800/60"></div>
                    </div>
                    <button 
                      onClick={() => { const temp = fgColor; setFgColor(bgColor); setBgColor(temp); }}
                      className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[#111827] border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all active:scale-95"
                      title="Swap Colors"
                    >
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Background Section */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-300">Background</span>
                      <div className="text-xs text-gray-400 bg-[#0B0F19] px-3 py-1.5 rounded-lg border border-gray-700/60 uppercase tracking-wider font-mono">
                        {bgColor}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {presetBgColors.map(color => (
                        <button 
                          key={color.hex} 
                          onClick={() => setBgColor(color.hex)} 
                          className={`relative group w-8 h-8 rounded-full transition-all duration-200 ${bgColor.toUpperCase() === color.hex.toUpperCase() ? 'ring-2 ring-[#4F46E5] ring-offset-[3px] ring-offset-[#111827]' : 'hover:scale-110'}`} 
                          style={{ backgroundColor: color.hex }} 
                        >
                           {color.hex === "#FFFFFF" && <div className="absolute inset-0 rounded-full border border-gray-300" />}
                           <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                            {color.name}
                          </div>
                        </button>
                      ))}
                      <label className="w-8 h-8 rounded-full border border-gray-600 border-dashed flex items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-800 transition-all ml-1">
                        <Plus className="w-4 h-4 text-gray-400" />
                        <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="sr-only" />
                      </label>
                    </div>
                  </div>

                  {/* Contrast Warning */}
                  {contrastRatio < 3 && (
                    <div className="flex items-start gap-1.5 mt-5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] leading-tight animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <p>Low contrast ({contrastRatio.toFixed(1)}:1). Code might not scan properly.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#111827] p-5 rounded-2xl border border-gray-800/60 shadow-xl flex flex-col gap-5 transition-all duration-300 hover:shadow-2xl hover:border-gray-700/60">
                <div>
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-200 mb-4"><LayoutTemplate className="w-4 h-4 text-indigo-400" /> Pattern Style</h3>
                  <div className="grid grid-cols-3 gap-2 bg-[#0B0F19] rounded-xl p-1.5 border border-gray-700/60">
                    {["square", "dots", "rounded"].map((style) => (
                      <button 
                        key={style} 
                        onClick={() => setQrStyle(style as any)} 
                        className={`py-2 text-xs font-medium rounded-lg capitalize transition-all duration-300 active:scale-95 ${qrStyle === style ? "bg-[#4F46E5] text-white shadow-md" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold text-gray-200 mb-3"><ImageIcon className="w-4 h-4 text-indigo-400" /> Logo Insert</h3>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 file:transition-all cursor-pointer" />
                  {logo && <button onClick={() => setLogo(null)} className="mt-3 text-[11px] text-red-400 hover:text-red-300 transition-colors font-medium">Remove Current Logo</button>}
                </div>
              </div>
            </div>

            {/* History Section */}
            {history.length > 0 && (
              <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-400 mb-3"><History className="w-4 h-4" /> Recent Generations</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {history.map((item) => (
                    <div key={item.id} className="relative bg-[#111827] border border-gray-800/60 p-2.5 rounded-xl flex items-center justify-between group transition-all duration-300 hover:bg-[#151E2E] hover:border-indigo-500/50 hover:ring-2 hover:ring-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] overflow-hidden">
                      
                      <div className="flex items-center gap-3 w-full">
                        <div className="relative shrink-0 w-11 h-11">
                          {item.image ? (
                            <img src={item.image} alt="QR Thumbnail" className="w-full h-full object-cover rounded-lg bg-white p-0.5 shadow-sm" />
                          ) : (
                            <div className="w-full h-full rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                              <Scan className="w-5 h-5" />
                            </div>
                          )}
                          {renderHistoryIcon(item.tab)}
                        </div>

                        <div className="flex flex-col overflow-hidden transition-all duration-300 group-hover:pr-[90px]">
                          <span className="text-xs font-semibold text-gray-300 capitalize">{item.tab}</span>
                          <span className="text-[10px] text-gray-500 truncate w-full">{item.title}</span>
                        </div>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute right-0 inset-y-0 flex items-center gap-0.5 bg-gradient-to-l from-[#151E2E] via-[#151E2E] to-transparent pl-8 pr-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                        <button onClick={() => copyToClipboard(item.id, item.rawData)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-all active:scale-90" title="Copy Data">
                          {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => restoreHistoryItem(item)} className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-md transition-all active:scale-90" title="Restore Settings">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteHistoryItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-md transition-all active:scale-90" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Sticky Live Preview */}
          <div className="lg:col-span-5 lg:sticky lg:top-8 w-full">
            <div className="bg-[#111827] rounded-3xl border border-gray-800/60 p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden min-h-[500px] transition-all duration-500 hover:shadow-[0_0_40px_rgba(99,102,241,0.05)]">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>

              <div className="relative z-10 w-full flex flex-col items-center">
                <span className="text-[11px] font-semibold tracking-[0.2em] text-indigo-400/80 mb-6 uppercase flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${isEmptyState ? 'bg-gray-600' : isGenerating ? 'bg-amber-500 animate-pulse' : 'bg-indigo-500'}`}></span>
                  Live Preview
                </span>
                
                {/* Visual States */}
                <div className="relative w-[280px] h-[280px]">
                  {/* Empty State */}
                  <div className={`absolute inset-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-700/50 rounded-2xl bg-[#0B0F19]/50 transition-all duration-500 ${isEmptyState ? 'opacity-100 z-10' : 'opacity-0 scale-95 pointer-events-none z-0'}`}>
                    <QrCode className="w-12 h-12 text-gray-600 mb-3" />
                    <p className="text-sm font-medium text-gray-500">Enter data to generate</p>
                  </div>

                  {/* Loading State */}
                  <div className={`absolute inset-0 rounded-2xl skeleton-pulse transition-all duration-300 ${isGenerating && !isEmptyState ? 'opacity-100 z-20' : 'opacity-0 pointer-events-none z-0'}`}></div>
                  
                  {/* Actual QR Canvas */}
                  <div className={`absolute inset-0 p-4 rounded-2xl shadow-xl bg-white transition-all duration-500 ${!isEmptyState && !isGenerating ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 pointer-events-none z-0'}`}>
                    <div ref={qrRef} className="w-full h-full flex items-center justify-center" />
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="mt-8 w-full max-w-[280px] grid grid-cols-2 gap-3">
                  <button
                    onClick={() => downloadQR("png")}
                    disabled={downloadState !== "idle" || !!validationError || isEmptyState || isGenerating}
                    className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all duration-300 ${
                      validationError || isEmptyState || isGenerating
                        ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50 opacity-50" 
                        : downloadState === "png"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                          : "bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.35)] border border-transparent hover:-translate-y-1 active:translate-y-0 active:scale-95"
                    }`}
                  >
                    {downloadState === "png" ? <CheckCircle2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    PNG
                  </button>
                  
                  <button
                    onClick={() => downloadQR("svg")}
                    disabled={downloadState !== "idle" || !!validationError || isEmptyState || isGenerating}
                    className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all duration-300 ${
                      validationError || isEmptyState || isGenerating
                        ? "bg-gray-800/50 text-gray-500 cursor-not-allowed border border-gray-700/50 opacity-50"
                        : downloadState === "svg" 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
                          : "bg-transparent border-2 border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.15)] hover:-translate-y-1 active:translate-y-0 active:scale-95"
                    }`}
                  >
                    {downloadState === "svg" ? <CheckCircle2 className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                    SVG
                  </button>
                </div>
                
                <p className="text-gray-500 text-[10px] mt-5 flex items-center justify-center gap-1.5 w-full">
                  <Scan className="w-3 h-3" /> No tracking. Runs 100% locally.
                </p>
              </div>
            </div>
          </div>

          {/* --- TERMINAL FOOTER --- */}
          <div className="col-span-1 lg:col-span-12 flex flex-col items-center justify-center mt-12 pt-10 border-t border-gray-800/30">
            <a 
              href="https://ahmedsobhy28.github.io/portfolio/"
              className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-[#0B111B]/80 border border-[#00E5FF] text-[#00E5FF] font-mono text-xs sm:text-sm tracking-[0.2em] uppercase hover:bg-[#00E5FF]/10 transition-all duration-300 shadow-[0_0_15px_rgba(0,229,255,0.1)] hover:shadow-[0_0_25px_rgba(0,229,255,0.2)] overflow-hidden"
            >
              <ArrowLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-1.5" />
              <span className="relative z-10">Terminate Session & Return to Root</span>
            </a>
            <p className="mt-8 text-gray-500 font-mono text-[10px] sm:text-xs tracking-[0.25em] uppercase text-center">
              Engineered by Ahmed Sobhy // Web Developer & Architect
            </p>
          </div>

        </div>
      </div>
    </>
  );
}