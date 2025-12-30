import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Sparkles, TrendingUp, Copy, Check, Info, DollarSign, Package, AlertCircle, ShoppingBag, Landmark, BrainCircuit, Loader2, Save, RotateCcw, Swords, Target, Megaphone, Users, Share2, LayoutList, ArrowRightLeft, Percent, Calendar, BarChart3, Plus, Trash2, Tag, MessageSquare, Send, MessageCircle, Star, ThumbsUp, Truck, Image as ImageIcon, Download, Upload, X, Wand2, Palette, Camera, Lock, Type, Video, PlayCircle } from 'lucide-react';

// --- Gemini API Helpers ---

const callGeminiText = async (prompt) => {
  const apiKey = ""; // ระบบจะเติม API Key ให้เองตอนรัน
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
    
    if (!response.ok) throw new Error('API Error');
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return null;
  }
};

const callGeminiImage = async (prompt) => {
  const apiKey = ""; // ระบบจะเติม API Key ให้เองตอนรัน
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: { sampleCount: 1 }
        })
      }
    );

    if (!response.ok) throw new Error('Image API Error');

    const data = await response.json();
    if (data.predictions && data.predictions.length > 0) {
        return `data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`;
    }
    return null;
  } catch (error) {
    console.error("Gemini Image Error:", error);
    return null;
  }
};

const callGeminiImageToImage = async (prompt, base64Images) => {
  const apiKey = ""; // ระบบจะเติม API Key ให้เองตอนรัน
  try {
    // Construct parts: Text prompt + All images
    const parts = [{ text: prompt }];

    // Ensure it's an array
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];

    images.forEach(img => {
        const base64Data = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { responseModalities: ['IMAGE'] }
        })
      }
    );

    if (!response.ok) throw new Error('Image Gen Error');

    const data = await response.json();
    const imgData = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (imgData) {
        return `data:image/png;base64,${imgData}`;
    }
    return null;
  } catch (error) {
    console.error("Gemini Img2Img Error:", error);
    return null;
  }
};

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:scale-[1.02]",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    outline: "border-2 border-slate-200 text-slate-600 hover:border-blue-500 hover:text-blue-500",
    ghost: "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const InputGroup = ({ label, value, onChange, type = "text", placeholder, prefix, suffix, helpText }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
    <div className="relative">
      {prefix && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{prefix}</div>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''}`}
        placeholder={placeholder}
      />
      {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{suffix}</div>}
    </div>
    {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
  </div>
);

// --- Feature 1: Price Calculator ---

const PriceCalculator = () => {
  const [calcMode, setCalcMode] = useState('find_price'); // 'find_price' (หาค่าขาย) or 'check_profit' (เช็คกำไร)
  
  const [cost, setCost] = useState('');
  
  // For 'find_price' mode
  const [targetProfit, setTargetProfit] = useState('');
  const [profitType, setProfitType] = useState('amount'); // 'amount' or 'percent'

  // For 'check_profit' mode
  const [inputPrice, setInputPrice] = useState('');
  
  // New Fee Structure (with LocalStorage persistence)
  const [commissionFee, setCommissionFee] = useState(7.49);
  const [transactionFee, setTransactionFee] = useState(3.21);
  const [serviceFee, setServiceFee] = useState(7.49);
  const [fixedFee, setFixedFee] = useState(1);
  
  // VAT State
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  
  // Competitor Analysis
  const [competitorPrice, setCompetitorPrice] = useState('');
  
  const [shippingCost, setShippingCost] = useState(0); 
  const [result, setResult] = useState(null);

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('sellerProSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setCommissionFee(settings.commissionFee || 7.49);
      setTransactionFee(settings.transactionFee || 3.21);
      setServiceFee(settings.serviceFee || 7.49);
      setFixedFee(settings.fixedFee || 1);
      setIsVatRegistered(settings.isVatRegistered || false);
    }
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    const settings = { commissionFee, transactionFee, serviceFee, fixedFee, isVatRegistered };
    localStorage.setItem('sellerProSettings', JSON.stringify(settings));
  }, [commissionFee, transactionFee, serviceFee, fixedFee, isVatRegistered]);

  const calculateResult = () => {
    const costNum = parseFloat(cost) || 0;
    const shipNum = parseFloat(shippingCost) || 0;
    
    const commFeeRate = parseFloat(commissionFee) || 0;
    const transFeeRate = parseFloat(transactionFee) || 0;
    const servFeeRate = parseFloat(serviceFee) || 0;
    const fixedFeeAmt = parseFloat(fixedFee) || 0;

    // VAT Logic
    const vatRateDecimal = isVatRegistered ? (7 / 107) : 0; 
    
    let sellingPrice = 0;
    let actualProfit = 0;

    if (calcMode === 'find_price') {
        // --- Mode 1: Find Price (Reverse Calculation) ---
        const profitNum = parseFloat(targetProfit) || 0;
        let desiredProfitAmount = 0;
        if (profitType === 'amount') {
            desiredProfitAmount = profitNum;
        } else {
            desiredProfitAmount = costNum * (profitNum / 100);
        }

        const totalCost = costNum + shipNum;
        const totalVariableRate = (commFeeRate + transFeeRate + servFeeRate) / 100;
        const denominator = 1 - totalVariableRate - vatRateDecimal;
        
        if (denominator <= 0) return;
        
        sellingPrice = (totalCost + desiredProfitAmount + fixedFeeAmt) / denominator;
        
    } else {
        // --- Mode 2: Check Profit (Forward Calculation) ---
        sellingPrice = parseFloat(inputPrice) || 0;
        // Logic will calculate deductions below based on this sellingPrice
    }

    // Common Calculation Logic (Calculate Deductions based on Selling Price)
    const commAmt = sellingPrice * (commFeeRate / 100);
    const transAmt = sellingPrice * (transFeeRate / 100);
    const servAmt = sellingPrice * (servFeeRate / 100);
    const vatAmt = sellingPrice * vatRateDecimal;
    
    const totalDeduction = commAmt + transAmt + servAmt + fixedFeeAmt + vatAmt;
    const netReceive = sellingPrice - totalDeduction - shipNum;
    actualProfit = netReceive - costNum;

    // Competitor Analysis
    let compAnalysis = null;
    if (competitorPrice) {
      const compPriceNum = parseFloat(competitorPrice);
      const diff = sellingPrice - compPriceNum;
      const percentDiff = (diff / compPriceNum) * 100;
      
      if (diff > 0) {
        compAnalysis = { status: 'expensive', text: `แพงกว่าคู่แข่ง ${percentDiff.toFixed(1)}%`, color: 'text-red-500' };
      } else if (diff < 0) {
        compAnalysis = { status: 'cheaper', text: `ถูกกว่าคู่แข่ง ${Math.abs(percentDiff).toFixed(1)}%`, color: 'text-green-500' };
      } else {
        compAnalysis = { status: 'equal', text: 'ราคาเท่าคู่แข่งเป๊ะ', color: 'text-yellow-500' };
      }
    }

    setResult({
      price: sellingPrice,
      breakdown: {
        comm: commAmt,
        trans: transAmt,
        serv: servAmt,
        fixed: fixedFeeAmt,
        vat: vatAmt,
        totalFees: totalDeduction
      },
      actualProfit: actualProfit,
      margin: sellingPrice > 0 ? (actualProfit / sellingPrice) * 100 : 0,
      compAnalysis: compAnalysis
    });
  };

  const resetSettings = () => {
      setCommissionFee(7.49);
      setTransactionFee(3.21);
      setServiceFee(7.49);
      setFixedFee(1);
      setIsVatRegistered(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-600" /> คำนวณต้นทุน & กำไร
        </h3>

        {/* Mode Toggle */}
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mb-4">
            <button 
                onClick={() => { setCalcMode('find_price'); setResult(null); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${calcMode === 'find_price' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Target size={16} /> หา "ราคาขาย" ที่เหมาะสม
            </button>
            <button 
                onClick={() => { setCalcMode('check_profit'); setResult(null); }}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${calcMode === 'check_profit' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <DollarSign size={16} /> เช็ค "กำไร" จากราคาขาย
            </button>
        </div>
        
        <InputGroup 
          label="ต้นทุนสินค้า (COGS)" 
          type="number" 
          prefix="฿" 
          value={cost} 
          onChange={setCost} 
          placeholder="0.00" 
        />

        {/* Inputs change based on Mode */}
        {calcMode === 'find_price' ? (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <InputGroup 
                    label={profitType === 'amount' ? "กำไรที่ต้องการ (บาท)" : "กำไรที่ต้องการ (%)"}
                    type="number" 
                    prefix={profitType === 'amount' ? "฿" : "%"}
                    value={targetProfit} 
                    onChange={setTargetProfit} 
                    placeholder="0" 
                />
                <div className="mt-7">
                    <select 
                    value={profitType}
                    onChange={(e) => setProfitType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                    <option value="amount">บาท (ต่อชิ้น)</option>
                    <option value="percent">% (จากต้นทุน)</option>
                    </select>
                </div>
            </div>
        ) : (
            <div className="animate-fade-in">
                <InputGroup 
                    label="ราคาขายที่ตั้งไว้ (Selling Price)" 
                    type="number" 
                    prefix="฿" 
                    value={inputPrice} 
                    onChange={setInputPrice} 
                    placeholder="เช่น 199" 
                    helpText="ใส่ราคาที่คุณต้องการขายจริง เพื่อเช็คว่าจะเหลือเงินเท่าไหร่"
                />
            </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
           <InputGroup label="ต้นทุนแฝง/ค่ากล่อง" prefix="฿" value={shippingCost} onChange={setShippingCost} />
           <InputGroup label="ราคาขายคู่แข่ง (ถ้ามี)" prefix="฿" value={competitorPrice} onChange={setCompetitorPrice} placeholder="เปรียบเทียบราคา" />
        </div>

        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 space-y-3 relative group">
          <div className="flex justify-between items-center">
             <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2">
               <ShoppingBag size={14}/> ค่าธรรมเนียม Shopee (Auto-Save)
             </h4>
             <button onClick={resetSettings} className="text-xs text-orange-400 hover:text-orange-600 flex items-center gap-1">
               <RotateCcw size={10} /> รีเซ็ต
             </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="ค่าการขาย (Comm.)" suffix="%" value={commissionFee} onChange={setCommissionFee} />
            <InputGroup label="ค่าธุรกรรม (Trans.)" suffix="%" value={transactionFee} onChange={setTransactionFee} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputGroup label="ส่งฟรี+โค้ดคุ้ม" suffix="%" value={serviceFee} onChange={setServiceFee} />
             <InputGroup label="ค่าคงที่ (บาท/ออเดอร์)" prefix="฿" value={fixedFee} onChange={setFixedFee} />
          </div>
        </div>

        {/* VAT Toggle Section */}
        <div className={`p-4 rounded-lg border transition-all ${isVatRegistered ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Landmark size={18} className={isVatRegistered ? "text-blue-600" : "text-slate-400"} />
               <span className={`text-sm font-medium ${isVatRegistered ? "text-blue-800" : "text-slate-600"}`}>
                 จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)
               </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isVatRegistered} onChange={(e) => setIsVatRegistered(e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        <Button onClick={calculateResult} className={`w-full shadow-lg ${calcMode === 'find_price' ? 'shadow-blue-200' : 'shadow-green-200 from-green-600 to-teal-600'}`}>
          {calcMode === 'find_price' ? 'คำนวณราคาขาย' : 'คำนวณกำไรสุทธิ'}
        </Button>
      </div>

      <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20 -ml-10 -mb-10"></div>
        
        {result ? (
          <div className="relative z-10 space-y-4 animation-fade-in">
            <div className="text-center pb-4 border-b border-slate-700">
              <p className="text-slate-400 text-sm mb-1">
                  {calcMode === 'find_price' ? 'ราคาขายที่แนะนำ' : 'ราคาขายของคุณ'}
              </p>
              <h2 className="text-5xl font-bold text-green-400">฿{result.price.toLocaleString(undefined, {maximumFractionDigits: 0})}</h2>
              
              {result.compAnalysis && (
                <div className={`mt-2 text-sm font-bold flex items-center justify-center gap-2 ${result.compAnalysis.color}`}>
                   <Swords size={16} /> {result.compAnalysis.text}
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400 text-xs uppercase font-semibold">
                <span>รายละเอียดการหักเงิน</span>
                <span>บาท</span>
              </div>
              
              <div className="flex justify-between text-slate-300">
                <span>ค่าธรรมเนียม Shopee ({commissionFee}%)</span>
                <span className="text-red-300">-฿{result.breakdown.comm.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>ค่าธุรกรรม ({transactionFee}%)</span>
                <span className="text-red-300">-฿{result.breakdown.trans.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>ส่งฟรี+โค้ดคุ้ม ({serviceFee}%)</span>
                <span className="text-red-300">-฿{result.breakdown.serv.toFixed(2)}</span>
              </div>
               <div className="flex justify-between text-slate-300">
                <span>ค่าธรรมเนียมคงที่</span>
                <span className="text-red-300">-฿{result.breakdown.fixed.toFixed(2)}</span>
              </div>

              {/* VAT Line Item */}
              {isVatRegistered && (
                <div className="flex justify-between text-blue-200 bg-blue-900/30 px-2 py-1 rounded">
                  <span>นำส่ง VAT (7/107)</span>
                  <span>-฿{result.breakdown.vat.toFixed(2)}</span>
                </div>
              )}

              {/* Total Deduction Line */}
              <div className="flex justify-between text-orange-300 font-medium pt-1 pb-1 border-b border-slate-700/50 mb-1">
                  <span>รวมค่าธรรมเนียมทั้งหมด</span>
                  <span>-฿{result.breakdown.totalFees.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>

              <div className="flex justify-between text-slate-300 pt-1">
                 <span>ต้นทุนสินค้า + แพ็ค</span>
                 <span>-฿{(parseFloat(cost) + parseFloat(shippingCost)).toLocaleString()}</span>
              </div>
              
              <div className={`p-3 rounded-lg mt-3 flex justify-between items-center border ${result.actualProfit > 0 ? 'bg-slate-800/50 border-slate-700' : 'bg-red-900/20 border-red-800'}`}>
                <span className={result.actualProfit > 0 ? "text-blue-300 font-semibold" : "text-red-300 font-semibold"}>
                    {result.actualProfit > 0 ? 'กำไรสุทธิ' : 'ขาดทุน'}
                </span>
                <div className="text-right">
                    <div className={`text-xl font-bold ${result.actualProfit > 0 ? "text-blue-300" : "text-red-400"}`}>
                        {result.actualProfit > 0 ? '+' : ''}฿{result.actualProfit.toLocaleString(undefined, {maximumFractionDigits: 2})}
                    </div>
                    <div className="text-xs text-slate-400">Margin: {result.margin.toFixed(2)}%</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 relative z-10">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>กรอกข้อมูลต้นทุนด้านซ้าย<br/>เพื่อ{calcMode === 'find_price' ? 'หา "ราคาขาย" ที่เหมาะสม' : 'เช็ค "กำไร" ที่แท้จริง'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Feature 2: AI Content Generator (Powered by Gemini) - Pro Mode ---

const ContentGenerator = () => {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [features, setFeatures] = useState('');
  const [brand, setBrand] = useState('');
  
  // Pro Features
  const [contentType, setContentType] = useState('listing'); // 'listing' or 'social'
  const [tone, setTone] = useState('friendly'); // friendly, professional, urgent
  const [targetAudience, setTargetAudience] = useState('');
  const [shopInfo, setShopInfo] = useState(''); // New state for auto-saved shop info

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [error, setError] = useState(null);

  // Load shop info on mount
  useEffect(() => {
    const savedShopInfo = localStorage.getItem('sellerProShopInfo');
    if (savedShopInfo) {
      setShopInfo(savedShopInfo);
    }
  }, []);

  // Save shop info whenever it changes
  useEffect(() => {
    localStorage.setItem('sellerProShopInfo', shopInfo);
  }, [shopInfo]);

  const generateContent = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);

    const toneMap = {
      friendly: 'เป็นกันเอง, น่ารัก, ใช้ภาษาพูด, เข้าถึงง่าย (Friendly & Casual)',
      professional: 'ทางการ, น่าเชื่อถือ, ข้อมูลแน่น, ดูพรีเมียม (Professional & Trustworthy)',
      urgent: 'ตื่นเต้น, เร่งการตัดสินใจ, Hard Sell, เน้นความคุ้มค่า (Urgent & Exciting)'
    };

    let prompt = '';

    if (contentType === 'listing') {
        // --- Shopee/Lazada Listing Prompt (Detailed & Factual + Shop Info) ---
        prompt = `
            คุณคือผู้เชี่ยวชาญด้านการจัดการข้อมูลสินค้า E-marketplace (Shopee/Lazada)
            
            ข้อมูลสินค้า:
            - ชื่อสินค้า: ${productName}
            - หมวดหมู่: ${category}
            - แบรนด์: ${brand || '-'}
            - จุดเด่น/สเปค: ${features}
            - ข้อมูลร้านค้า/นโยบาย (Shop Info): ${shopInfo || '-'}
            
            ภารกิจ: เขียน "รายละเอียดสินค้า (Product Description)" แบบทางการ เน้นความครบถ้วนของข้อมูล ไม่ต้องเน้นสำนวนการตลาด (No Fluff) เพื่อให้ลูกค้าตัดสินใจง่าย
            
            1. **ชื่อสินค้า (Title):** ใส่ชื่อแบรนด์ + รุ่น + คีย์เวิร์ดหลัก + คุณสมบัติเด่น (เน้น SEO)
            2. **รายละเอียด (Description):** จัดรูปแบบให้อ่านง่าย แบ่งเป็นส่วนๆ ดังนี้:
               - [เกริ่นนำสั้นๆ เกี่ยวกับสินค้า]
               - ✨ **คุณสมบัติเด่น:** (Bullet points)
               - 📊 **ข้อมูลจำเพาะ/สเปค:** (Technical Specs เช่น ขนาด, น้ำหนัก, วัสดุ, แบตเตอรี่ ฯลฯ)
               - 📦 **อุปกรณ์ภายในกล่อง:**
               - 🛡️ **เงื่อนไขการรับประกัน:**
               - 📝 **ข้อมูลร้านค้า/หมายเหตุ:** (นำข้อมูล Shop Info ที่ให้ไปมาสรุปปิดท้าย)
            3. **Hashtags:** SEO Keywords ที่เกี่ยวข้อง 10 คำ
            
            **ตอบกลับเป็น JSON format เท่านั้น**:
            { "title": "...", "description": "...", "hashtags": "..." }
        `;
    } else {
        // --- Social Media Post Prompt ---
        prompt = `
            คุณคือ Social Media Content Creator มือโปร (Facebook/TikTok/IG)
            
            ข้อมูลสินค้า:
            - ชื่อสินค้า: ${productName}
            - จุดเด่น: ${features}
            - กลุ่มเป้าหมาย: ${targetAudience || 'วัยรุ่น/คนทำงาน'}
            - โทนเสียง: ${toneMap[tone]}
            
            ภารกิจ: เขียน "แคปชั่นโพสต์ขายของ (Social Post)" เน้นยอด Engagement (ไลค์/แชร์)
            1. **พาดหัว (Headline/Hook):** (ใส่ในช่อง title) ประโยคเด็ดหยุดนิ้วโป้ง ไม่ต้องเน้น SEO มาก แต่เน้นความอยากรู้อยากเห็นหรือโปรโมชั่นแรงๆ
            2. **เนื้อหา (Caption):** (ใส่ในช่อง description) เล่าเรื่อง (Storytelling) สั้นกระชับ อ่านสนุก ป้ายยา เน้นอารมณ์ (Emotion) มากกว่าสเปค
               - ปิดท้ายด้วย CTA (เช่น ทักแชท, จิ้มลิงก์หน้าโปรไฟล์)
            3. **Hashtags:** ตามเทรนด์โซเชียล
            
            **ตอบกลับเป็น JSON format เท่านั้น**:
            { "title": "...", "description": "...", "hashtags": "..." }
        `;
    }

    try {
      const textResult = await callGeminiText(prompt);
      if (!textResult) throw new Error("No response from AI");

      // Clean string
      const jsonString = textResult.replace(/```json|```/g, '').trim();
      const content = JSON.parse(jsonString);

      setGeneratedContent(content);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
         <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" /> ข้อมูลสินค้า (Gemini Pro Mode)
        </h3>
        
        {/* Content Type Selector */}
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mb-2">
            <button 
                onClick={() => setContentType('listing')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${contentType === 'listing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <LayoutList size={16} /> ลงขาย (Shopee/Lazada)
            </button>
            <button 
                onClick={() => setContentType('social')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${contentType === 'social' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Share2 size={16} /> โพสต์โซเชียล (FB/IG)
            </button>
        </div>

        <InputGroup label="ชื่อสินค้า" value={productName} onChange={setProductName} placeholder="เช่น หูฟังไร้สาย TWS" />
        <div className="grid grid-cols-2 gap-4">
          <InputGroup label="หมวดหมู่" value={category} onChange={setCategory} placeholder="เช่น อุปกรณ์ไอที" />
          <InputGroup label="แบรนด์ (ถ้ามี)" value={brand} onChange={setBrand} placeholder="เช่น Baseus" />
        </div>
        
        {/* Pro Features Inputs */}
        <div className="grid grid-cols-2 gap-4">
           {contentType === 'social' && (
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                 <Megaphone size={12} /> สไตล์การเขียน
              </label>
              <select 
                value={tone} 
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="friendly">😊 เป็นกันเอง/น่ารัก</option>
                <option value="professional">👔 ทางการ/น่าเชื่อถือ</option>
                <option value="urgent">🔥 ตื่นเต้น/Hard Sell</option>
              </select>
           </div>
           )}
           <div className={contentType === 'listing' ? 'col-span-2' : ''}>
               <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                 <Users size={12} /> กลุ่มเป้าหมาย
              </label>
              <input 
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="เช่น วัยรุ่น, แม่บ้าน"
              />
           </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">จุดเด่น/คีย์เวิร์ด</label>
           <textarea 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg h-24 focus:ring-2 focus:ring-purple-500 outline-none"
            placeholder="เช่น เสียงเบสหนัก, กันน้ำ IPX4, แบตอึด 24ชม."
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
           ></textarea>
        </div>

        {/* Shop Info - Auto Save */}
        {contentType === 'listing' && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Save size={14} className="text-blue-500" /> ข้อมูลร้านค้า/นโยบาย (บันทึกอัตโนมัติ)
                </label>
                <textarea
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg h-20 focus:ring-2 focus:ring-blue-500 outline-none text-sm placeholder:text-slate-400"
                    placeholder="เช่น ตัดรอบส่ง 12.00 น., สินค้ามีประกัน 7 วัน, ติดต่อร้าน..."
                    value={shopInfo}
                    onChange={(e) => setShopInfo(e.target.value)}
                ></textarea>
                <p className="text-[10px] text-slate-400 mt-1">*ข้อความนี้จะถูกบันทึกไว้และนำไปต่อท้ายรายละเอียดสินค้าทุกครั้ง</p>
            </div>
        )}

        <Button onClick={generateContent} variant="primary" disabled={isGenerating || !productName} className={`w-full bg-gradient-to-r ${contentType === 'listing' ? 'from-purple-600 to-indigo-600' : 'from-pink-500 to-orange-500'}`}>
          {isGenerating ? (
            <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> กำลังสร้างคอนเทนต์...</span>
          ) : (
            <span className="flex items-center gap-2">✨ สร้าง{contentType === 'listing' ? 'รายละเอียดสินค้า' : 'โพสต์โซเชียล'}</span>
          )}
        </Button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full max-h-[600px] overflow-y-auto min-h-[300px]">
        {generatedContent ? (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${contentType === 'listing' ? 'text-green-600 bg-green-50' : 'text-pink-600 bg-pink-50'}`}>
                    {contentType === 'listing' ? 'SEO Title' : 'Headline / Hook'}
                  </span>
                  <button onClick={() => copyToClipboard(generatedContent.title)} className="text-slate-400 hover:text-blue-500"><Copy size={14}/></button>
                </div>
                <p className="font-medium text-slate-800">{generatedContent.title}</p>
             </div>

             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                     {contentType === 'listing' ? 'Description' : 'Caption'}
                  </span>
                  <button onClick={() => copyToClipboard(generatedContent.description)} className="text-slate-400 hover:text-blue-500"><Copy size={14}/></button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans leading-relaxed">{generatedContent.description}</pre>
             </div>

             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">Hashtags</span>
                  <button onClick={() => copyToClipboard(generatedContent.hashtags)} className="text-slate-400 hover:text-blue-500"><Copy size={14}/></button>
                </div>
                <p className="text-blue-500 text-sm">{generatedContent.hashtags}</p>
             </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            {isGenerating ? <Loader2 className="animate-spin mb-2" size={48} /> : <Sparkles size={48} className="mb-2" />}
            <p>{isGenerating ? "Gemini กำลังทำงาน..." : "AI รอสร้างเนื้อหาให้คุณอยู่..."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Feature 3: Ad Optimizer (With AI Strategic Analysis) ---

const AdOptimizer = () => {
  const [productPrice, setProductPrice] = useState('');
  const [profitPerPcs, setProfitPerPcs] = useState('');
  const [conversionRate, setConversionRate] = useState(2);
  const [adGoal, setAdGoal] = useState('profit'); // profit, sales, awareness
  
  const [aiAdvice, setAiAdvice] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Calculations
  const breakevenCPC = parseFloat(profitPerPcs) * (parseFloat(conversionRate) / 100);
  const breakevenROAS = parseFloat(productPrice) / parseFloat(profitPerPcs);
  
  const analyzeWithAI = async () => {
    if (!productPrice || !profitPerPcs) return;
    setIsAnalyzing(true);
    setAiAdvice(null);
    
    const goalMap = {
      profit: 'เน้นกำไรสูงสุด (Maximize ROI) - ยอมขายได้น้อยแต่ต้องกำไรทุกออเดอร์',
      sales: 'เน้นยอดขาย (Maximize Sales/Volume) - ต้องการแย่งส่วนแบ่งตลาด ยอมกำไรน้อยลง',
      awareness: 'เน้นการมองเห็น (Brand Awareness) - ต้องการให้คนเห็นเยอะที่สุด'
    };

    const prompt = `
      คุณคือผู้เชี่ยวชาญด้าน Shopee Ads / Paid Media Strategist
      
      ข้อมูลสินค้า:
      - ราคาขาย: ${productPrice} บาท
      - กำไรต่อชิ้น: ${profitPerPcs} บาท
      - Conversion Rate ที่คาดหวัง: ${conversionRate}%
      - **เป้าหมายแคมเปญ:** ${goalMap[adGoal]}
      
      ช่วยวิเคราะห์เชิงลึกและวางแผนกลยุทธ์:
      1. **การประเมินความเสี่ยง:** วิเคราะห์จาก Margin และ Conversion Rate ว่าเป้าหมายนี้เป็นไปได้ยากง่ายแค่ไหน
      2. **กลยุทธ์การประมูล (Bidding Strategy):** - ควรใช้ Broad หรือ Exact Match?
         - ควร Bid ต่ำกว่าหรือสูงกว่าราคากลาง?
      3. **งบประมาณแนะนำ:** การจัดสรรงบ (Budget Allocation)
      4. **คำแนะนำพิเศษ:** เทคนิคเฉพาะสำหรับเป้าหมายแบบ "${adGoal}"
      
      ตอบเป็นภาษาไทย ใช้ภาษาธุรกิจที่เข้าใจง่าย จัดรูปแบบให้อ่านสบายตา
    `;
    
    const result = await callGeminiText(prompt);
    setAiAdvice(result);
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
           <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-orange-600" /> คำนวณงบโฆษณา
          </h3>
          <div className="space-y-4">
             <InputGroup label="ราคาขายสินค้า" type="number" prefix="฿" value={productPrice} onChange={setProductPrice} />
             <InputGroup label="กำไรต่อชิ้น (บาท)" type="number" prefix="฿" value={profitPerPcs} onChange={setProfitPerPcs} />
             
             <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                    <InputGroup 
                    label="CR ที่คาดหวัง (%)" 
                    type="number" 
                    suffix="%" 
                    value={conversionRate} 
                    onChange={setConversionRate} 
                    />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                     <Target size={12} /> เป้าหมายแคมเปญ
                   </label>
                   <select 
                        value={adGoal} 
                        onChange={(e) => setAdGoal(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="profit">💰 เน้นกำไร (ROI)</option>
                        <option value="sales">📈 เน้นยอดขาย (Volume)</option>
                        <option value="awareness">👀 เน้นคนเห็น (Awareness)</option>
                    </select>
                </div>
             </div>
             
             
             <Button 
                onClick={analyzeWithAI} 
                variant="primary" 
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 border-none text-white"
                disabled={isAnalyzing || !productPrice || !profitPerPcs}
             >
                {isAnalyzing ? <Loader2 className="animate-spin" size={16}/> : <BrainCircuit size={16} />} 
                {isAnalyzing ? 'Gemini กำลังวางแผนกลยุทธ์...' : 'ขอคำแนะนำจาก AI'}
             </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl">
             <h4 className="font-semibold text-orange-900 mb-2">💡 ค่าโฆษณาที่แนะนำ (Max CPC)</h4>
             <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-orange-600">
                  ฿{isNaN(breakevenCPC) ? '0.00' : breakevenCPC.toFixed(2)}
                </span>
                <span className="text-sm text-orange-400 mb-1">/ คลิก</span>
             </div>
             <p className="text-xs text-orange-700 mt-2">
               *นี่คือราคาประมูลสูงสุดที่คุณจ่ายได้แล้ว "เท่าทุน"
             </p>
          </div>

           <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl">
             <h4 className="font-semibold text-blue-900 mb-2">🎯 เป้าหมาย ROAS ขั้นต่ำ</h4>
             <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-blue-600">
                  {isNaN(breakevenROAS) || !isFinite(breakevenROAS) ? '0.00' : breakevenROAS.toFixed(2)}
                </span>
                <span className="text-sm text-blue-400 mb-1">เท่า</span>
             </div>
             <p className="text-xs text-blue-700 mt-2">
               *ต้องทำเงินได้ {isNaN(breakevenROAS) ? '0' : breakevenROAS.toFixed(1)} บาท จากทุก 1 บาทที่จ่าย
             </p>
          </div>
        </div>
      </div>

      {aiAdvice && (
        <div className="animate-fade-in bg-white border border-indigo-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
           <h4 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
             <Sparkles size={18} className="text-indigo-500" /> แผนกลยุทธ์โดย Gemini
           </h4>
           <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line leading-relaxed">
             {aiAdvice}
           </div>
        </div>
      )}

      {!aiAdvice && (
      <div className="border-t border-slate-200 pt-6">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">🏆 สูตรลับพื้นฐาน</h3>
         <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 hover:shadow-md transition-shadow">
               <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-3 font-bold">1</div>
               <h4 className="font-bold text-slate-700">ช่วงแรก (Testing)</h4>
               <p className="text-sm text-slate-500 mt-2">
                 เลือก <strong>Broad Match</strong> เปิดการมองเห็น 
                 งบ 50-100 บาท/วัน
               </p>
            </Card>
             <Card className="p-4 hover:shadow-md transition-shadow">
               <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-3 font-bold">2</div>
               <h4 className="font-bold text-slate-700">คัดกรอง (Scaling)</h4>
               <p className="text-sm text-slate-500 mt-2">
                 คีย์เวิร์ดขายดี {'->'} เปลี่ยนเป็น <strong>Exact Match</strong> เพิ่มบิด 20%
               </p>
            </Card>
             <Card className="p-4 hover:shadow-md transition-shadow">
               <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-3 font-bold">3</div>
               <h4 className="font-bold text-slate-700">รูปภาพคือหัวใจ</h4>
               <p className="text-sm text-slate-500 mt-2">
                 ต้องมี <strong>กรอบเด่น, ตัวหนังสือใหญ่, ป้ายลดราคา</strong> เพื่อเพิ่ม CTR
               </p>
            </Card>
         </div>
      </div>
      )}
    </div>
  );
};

// --- Feature 4: Promo Planner (Multi-Item AI Support & Chat) ---

const PromoPlanner = () => {
  // Items State
  const [promoItems, setPromoItems] = useState([]);
  
  // New Item Input State
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Goal State
  const [targetTotalProfit, setTargetTotalProfit] = useState('');
  const [duration, setDuration] = useState('7');
  const [platform, setPlatform] = useState('Shopee');

  // Result State
  const [aiPlan, setAiPlan] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  
  // Right Panel State (Plan vs Chat)
  const [activeRightTab, setActiveRightTab] = useState('plan'); // 'plan' or 'chat'

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'สวัสดีครับ ผมคือ AI ผู้ช่วยวางแผนโปรโมชั่น มีอะไรให้ช่วยปรึกษาไหมครับ? (เช่น "ช่วยคิดธีมแคมเปญให้หน่อย", "ลดราคาตัวไหนดีสุด")' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Switch to plan tab when plan is generated
  useEffect(() => {
    if (aiPlan) setActiveRightTab('plan');
  }, [aiPlan]);

  // Settings (Read-only for fee context)
  const [settings, setSettings] = useState({
    commissionFee: 7.49,
    transactionFee: 3.21,
    serviceFee: 7.49,
    fixedFee: 1,
    isVatRegistered: false
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('sellerProSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const addItem = () => {
    if (!newItemName || !newItemCost || !newItemPrice) return;
    setPromoItems([...promoItems, {
        id: Date.now(),
        name: newItemName,
        cost: parseFloat(newItemCost),
        price: parseFloat(newItemPrice)
    }]);
    setNewItemName('');
    setNewItemCost('');
    setNewItemPrice('');
  };

  const removeItem = (id) => {
    setPromoItems(promoItems.filter(item => item.id !== id));
  };

  const generatePlanWithAI = async () => {
    if (promoItems.length === 0 || !targetTotalProfit) return;
    setIsPlanning(true);
    setAiPlan(null);

    // Calculate approximate fees to inform AI
    const totalFeePercent = settings.commissionFee + settings.transactionFee + settings.serviceFee;
    const vatInfo = settings.isVatRegistered ? "+ VAT 7% on selling price" : "No VAT registration";

    const itemsContext = promoItems.map(item => 
        `- ${item.name}: Cost ${item.cost}, Normal Price ${item.price}`
    ).join('\n');

    const prompt = `
      คุณคือ AI Campaign Manager ผู้เชี่ยวชาญด้าน E-commerce (Shopee, Lazada, TikTok)
      
      โจทย์:
      - แพลตฟอร์ม: ${platform}
      - ค่าธรรมเนียมโดยประมาณ: ${totalFeePercent}% + ${settings.fixedFee} บาทต่อออเดอร์ (${vatInfo})
      - เป้าหมาย: ต้องการ "กำไรสุทธิรวม (Total Net Profit)" ให้ได้ **${targetTotalProfit} บาท** ภายใน **${duration} วัน**
      
      รายการสินค้าที่มี:
      ${itemsContext}
      
      ภารกิจของคุณ:
      1. **วางกลยุทธ์ส่วนลด (Discount Strategy):** วิเคราะห์ Margin ของแต่ละสินค้า 
         - สินค้าไหนกำไรเยอะ ให้ลดเยอะเพื่อดึงคน (Hook)
         - สินค้าไหนกำไรน้อย ให้ลดน้อยเพื่อรักษากำไร
      2. **คำนวณเป้ายอดขาย (Sales Targets):** ต้องขายแต่ละตัวกี่ชิ้นถึงจะได้กำไรรวมตามเป้า 
         - ให้ประเมิน "สัดส่วนการขาย (Sales Mix)" ตามธรรมชาติ (ของถูกมักขายดีกว่าของแพง)
      
      **ตอบกลับเป็น JSON Format เท่านั้น** โดยมีโครงสร้างดังนี้:
      {
        "items": [
          { 
            "name": "ชื่อสินค้า", 
            "discountPercent": 10, 
            "promoPrice": 180, 
            "targetUnits": 50, 
            "reason": "เหตุผลสั้นๆ เช่น เป็นตัวดึงลูกค้า" 
          }
        ],
        "summary": {
          "totalRevenue": 50000,
          "estimatedTotalProfit": 10500,
          "strategyNote": "คำแนะนำภาพรวมสั้นๆ"
        }
      }
    `;

    try {
      const textResult = await callGeminiText(prompt);
      if (!textResult) throw new Error("No response");
      
      const jsonString = textResult.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(jsonString);
      setAiPlan(plan);
    } catch (err) {
      console.error(err);
      // Fallback or error handling could go here
    } finally {
      setIsPlanning(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    
    const userText = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsChatting(true);

    // Context building
    const itemsContext = promoItems.length > 0 
        ? promoItems.map(item => `${item.name} (ทุน ${item.cost}, ขาย ${item.price})`).join(', ')
        : 'ยังไม่มีสินค้าในรายการ';
    
    const goalContext = targetTotalProfit 
        ? `เป้ากำไร: ${targetTotalProfit}, ระยะเวลา: ${duration} วัน, Platform: ${platform}`
        : 'ยังไม่ได้ตั้งเป้าหมายชัดเจน';
    
    const prompt = `
      คุณคือ AI ที่ปรึกษาด้านการตลาดและการจัดโปรโมชั่น
      
      Context ปัจจุบันของผู้ใช้:
      สินค้าที่มี: ${itemsContext}
      เป้าหมายแคมเปญ: ${goalContext}
      
      คำถามจากผู้ใช้: ${userText}
      
      คำแนะนำ: ตอบคำถามให้กระชับ เป็นกันเอง และเน้นกลยุทธ์ที่ใช้ได้จริงใน E-commerce
    `;

    try {
      const response = await callGeminiText(prompt);
      setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'ai', text: 'ขออภัย ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะครับ' }]);
    } finally {
      setIsChatting(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Percent className="w-5 h-5 text-pink-500" /> จัดพอร์ตสินค้า & วางแผนโปรฯ
        </h3>
        
        {/* Add Item Section */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                <Plus size={16} /> เพิ่มรายการสินค้าในแคมเปญ
            </h4>
            <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5">
                    <input 
                        className="w-full p-2 text-sm border rounded-lg" 
                        placeholder="ชื่อสินค้า" 
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                    />
                </div>
                <div className="col-span-3">
                    <input 
                        type="number" 
                        className="w-full p-2 text-sm border rounded-lg" 
                        placeholder="ทุน" 
                        value={newItemCost}
                        onChange={(e) => setNewItemCost(e.target.value)}
                    />
                </div>
                <div className="col-span-3">
                    <input 
                        type="number" 
                        className="w-full p-2 text-sm border rounded-lg" 
                        placeholder="ราคาเต็ม" 
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                    />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                    <button onClick={addItem} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Item List */}
            <div className="space-y-2 max-h-40 overflow-y-auto mt-2">
                {promoItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-sm">
                        <div className="flex-1 font-medium truncate">{item.name}</div>
                        <div className="flex gap-3 text-slate-500 mr-3">
                            <span>ทุน: {item.cost}</span>
                            <span>ขาย: {item.price}</span>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {promoItems.length === 0 && <p className="text-center text-xs text-slate-400 py-2">ยังไม่มีสินค้าในรายการ</p>}
            </div>
        </div>

        <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
           <h4 className="text-sm font-bold text-pink-800 mb-3 flex items-center gap-2"><Target size={16}/> เป้าหมายแคมเปญ</h4>
           <div className="grid grid-cols-2 gap-4 mb-3">
              <InputGroup label="กำไรรวมที่ต้องการ (บาท)" type="number" prefix="฿" value={targetTotalProfit} onChange={setTargetTotalProfit} />
              <InputGroup label="ระยะเวลา (วัน)" type="number" suffix="วัน" value={duration} onChange={setDuration} />
           </div>
           <div>
               <label className="block text-sm font-medium text-pink-800 mb-1">Platform หลัก</label>
               <div className="flex gap-2">
                   {['Shopee', 'Lazada', 'TikTok'].map(p => (
                       <button 
                        key={p}
                        onClick={() => setPlatform(p)}
                        className={`flex-1 py-1.5 text-xs rounded border transition-all ${platform === p ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-pink-600 border-pink-200'}`}
                       >
                           {p}
                       </button>
                   ))}
               </div>
           </div>
        </div>

        <Button onClick={generatePlanWithAI} disabled={isPlanning || promoItems.length === 0} className="w-full shadow-lg shadow-pink-200 bg-gradient-to-r from-pink-500 to-rose-500">
          {isPlanning ? <><Loader2 className="animate-spin" size={16}/> AI กำลังคำนวณสูตร...</> : <><BrainCircuit size={16}/> ให้ AI ช่วยจัดโปรฯ</>}
        </Button>
      </div>

      <div className="bg-slate-900 text-white rounded-xl flex flex-col relative overflow-hidden min-h-[500px]">
        {/* Right Panel Header / Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900/50">
            <button 
                onClick={() => setActiveRightTab('plan')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeRightTab === 'plan' ? 'text-pink-400 border-b-2 border-pink-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
                <BarChart3 size={16} /> ผลการคำนวณ (Plan)
            </button>
            <button 
                onClick={() => setActiveRightTab('chat')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeRightTab === 'chat' ? 'text-pink-400 border-b-2 border-pink-400 bg-slate-800/50' : 'text-slate-400 hover:text-slate-200'}`}
            >
                <MessageSquare size={16} /> ปรึกษา AI (Chat)
            </button>
        </div>

        {/* Tab 1: AI Plan Result */}
        {activeRightTab === 'plan' && (
            <div className="flex-1 p-6 flex flex-col relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20 -ml-10 -mb-10"></div>
                
                {aiPlan ? (
                <div className="relative z-10 space-y-5 animation-fade-in h-full flex flex-col">
                    <div className="text-center pb-4 border-b border-slate-700">
                    <p className="text-slate-400 text-sm mb-1">แผนการขายเพื่อเป้ากำไร {parseFloat(targetTotalProfit).toLocaleString()} บาท</p>
                    <h2 className="text-3xl font-bold text-white mb-2">ยอดขายรวม: ฿{aiPlan.summary.totalRevenue.toLocaleString()}</h2>
                    <div className="inline-block bg-slate-800 px-3 py-1 rounded-full text-xs text-pink-300 border border-slate-700">
                        {aiPlan.summary.strategyNote}
                    </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs uppercase bg-slate-800 text-slate-400 sticky top-0">
                                <tr>
                                    <th className="px-2 py-2 rounded-l-lg">สินค้า</th>
                                    <th className="px-2 py-2">ส่วนลด</th>
                                    <th className="px-2 py-2">ราคาโปร</th>
                                    <th className="px-2 py-2 rounded-r-lg text-right">เป้า/วัน</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {aiPlan.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-800/30">
                                        <td className="px-2 py-3 font-medium text-white">
                                            {item.name}
                                            <div className="text-[10px] text-slate-500 font-normal">{item.reason}</div>
                                        </td>
                                        <td className="px-2 py-3 text-red-400 font-bold">-{item.discountPercent}%</td>
                                        <td className="px-2 py-3 text-white">฿{item.promoPrice}</td>
                                        <td className="px-2 py-3 text-right">
                                            <div className="font-bold text-green-400">{Math.ceil(item.targetUnits / parseInt(duration))} ชิ้น</div>
                                            <div className="text-[10px] text-slate-500">รวม {item.targetUnits}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-slate-700 text-center text-xs text-slate-500">
                        *การคำนวณรวมค่าธรรมเนียม {platform} โดยประมาณแล้ว
                    </div>
                </div>
                ) : (
                <div className="text-center text-slate-500 relative z-10 flex flex-col items-center justify-center h-full">
                    <div className="bg-slate-800 p-4 rounded-full mb-4">
                        <BarChart3 className="w-10 h-10 opacity-50 text-pink-400" />
                    </div>
                    <p className="text-lg text-slate-300 mb-2">AI Campaign Planner</p>
                    <p className="text-sm max-w-xs mx-auto opacity-70">
                        เพิ่มสินค้าของคุณทางซ้ายมือ และตั้งเป้าหมายกำไร <br/>
                        AI จะช่วยคำนวณ "ส่วนลดที่เหมาะสม" และ "จำนวนที่ต้องขาย" ให้เอง
                    </p>
                </div>
                )}
            </div>
        )}

        {/* Tab 2: AI Chat Advisor */}
        {activeRightTab === 'chat' && (
            <div className="flex-1 flex flex-col bg-slate-900 h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-pink-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                
                <div className="p-3 bg-slate-800 border-t border-slate-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                            placeholder="พิมพ์คำถาม... (เช่น ขอไอเดียธีม 11.11)"
                            className="flex-1 bg-slate-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-pink-500 border border-slate-600 placeholder:text-slate-400"
                            disabled={isChatting}
                        />
                        <button 
                            onClick={handleSendChat}
                            disabled={isChatting || !chatInput.trim()}
                            className="bg-pink-600 hover:bg-pink-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isChatting ? <Loader2 size={18} className="animate-spin"/> : <Send size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- Feature 5: Smart Reply (Review/Chat Assistant) ---

const SmartReply = () => {
  const [customerMsg, setCustomerMsg] = useState('');
  const [situation, setSituation] = useState('review_positive');
  const [tone, setTone] = useState('professional');
  const [replies, setReplies] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReplies = async () => {
    if (!customerMsg.trim()) return;
    setIsGenerating(true);
    setReplies([]);

    const prompt = `
      คุณคือ AI ผู้ช่วยตอบแชทลูกค้าสำหรับร้านค้า E-commerce (Shopee/Lazada)
      
      สถานการณ์: ${situation}
      โทนเสียง: ${tone}
      ข้อความจากลูกค้า: "${customerMsg}"
      
      ภารกิจ: สร้างข้อความตอบกลับ 3 แบบ ที่แตกต่างกันเล็กน้อย แต่ยังคงความหมายและโทนเสียงเดิม
      
      **ตอบกลับเป็น JSON Array of Strings เท่านั้น**:
      ["ข้อความแบบที่ 1...", "ข้อความแบบที่ 2...", "ข้อความแบบที่ 3..."]
    `;

    try {
      const textResult = await callGeminiText(prompt);
      if (!textResult) throw new Error("No response");
      
      const jsonString = textResult.replace(/```json|```/g, '').trim();
      const result = JSON.parse(jsonString);
      if (Array.isArray(result)) {
        setReplies(result);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-teal-600" /> ตอบแชท/รีวิวอัจฉริยะ
        </h3>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">ข้อความจากลูกค้า / รีวิว</label>
           <textarea 
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg h-32 focus:ring-2 focus:ring-teal-500 outline-none"
            placeholder="เช่น สินค้าส่งช้ามาก, ได้รับของแล้วชอบมากค่ะ, มีของพร้อมส่งไหมคะ"
            value={customerMsg}
            onChange={(e) => setCustomerMsg(e.target.value)}
           ></textarea>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">สถานการณ์</label>
              <select 
                value={situation} 
                onChange={(e) => setSituation(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="review_positive">⭐ รีวิวเชิงบวก (5 ดาว)</option>
                <option value="review_negative">😡 รีวิวเชิงลบ/ตำหนิ</option>
                <option value="inquiry_product">📦 สอบถามสินค้า</option>
                <option value="inquiry_shipping">🚚 ตามพัสดุ/ส่งช้า</option>
              </select>
           </div>
           <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">โทนเสียง</label>
               <select 
                value={tone} 
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="professional">👔 ทางการ/มืออาชีพ</option>
                <option value="friendly">😊 เป็นกันเอง/น่ารัก</option>
                <option value="apologetic">🙏 นอบน้อม/ขออภัย</option>
              </select>
           </div>
        </div>

        <Button onClick={generateReplies} disabled={isGenerating || !customerMsg} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-200">
          {isGenerating ? <><Loader2 className="animate-spin" size={16}/> กำลังร่างคำตอบ...</> : <><Sparkles size={16}/> สร้างคำตอบด้วย AI</>}
        </Button>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full overflow-y-auto">
        {replies.length > 0 ? (
          <div className="space-y-4 animate-fade-in">
             <div className="flex items-center justify-between text-slate-500 text-sm mb-2">
                <span>เลือกคำตอบที่ชอบที่สุด</span>
             </div>
             {replies.map((reply, idx) => (
                <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:border-teal-400 transition-colors group relative">
                   <p className="text-slate-700 whitespace-pre-line text-sm leading-relaxed pr-8">{reply}</p>
                   <button 
                      onClick={() => copyToClipboard(reply)}
                      className="absolute top-3 right-3 text-slate-300 hover:text-teal-600 p-1 rounded-md hover:bg-teal-50"
                      title="คัดลอก"
                   >
                      <Copy size={16} />
                   </button>
                </div>
             ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
             <MessageSquare size={48} className="mb-2" />
             <p>วางข้อความลูกค้าทางซ้าย<br/>เพื่อรับคำแนะนำการตอบกลับ</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Feature 6: AI Image Generator (With Pro Prompt System & Perspective) ---

const ImageGenerator = () => {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('General');
  const [targetStyle, setTargetStyle] = useState('Minimalist');
  const [perspective, setPerspective] = useState('Front View'); // New State for Perspective
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [imageResult, setImageResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]); // Support multiple images as per previous request

  const [preserveProduct, setPreserveProduct] = useState(true); // New state

  // Categories
  const categories = [
    { id: 'General', label: 'ทั่วไป' },
    { id: 'Fashion', label: 'แฟชั่น/เสื้อผ้า' },
    { id: 'Beauty', label: 'ความงาม/สกินแคร์' },
    { id: 'Food', label: 'อาหาร/เครื่องดื่ม' },
    { id: 'Electronics', label: 'อุปกรณ์ไอที' },
    { id: 'Home', label: 'ของใช้ในบ้าน' },
    { id: 'Kids', label: 'ของเล่นเด็ก' },
    { id: 'Luxury', label: 'เครื่องประดับ/แบรนด์เนม' },
  ];

  // Styles
  const styles = [
    { id: 'Minimalist', label: 'มินิมอล (Minimal)' },
    { id: 'Studio Lighting', label: 'สตูดิโอ (Studio)' },
    { id: 'Lifestyle', label: 'ไลฟ์สไตล์ (Lifestyle)' },
    { id: 'In Use', label: 'กำลังใช้งาน (In Use)' },
    { id: 'Cinematic', label: 'ภาพยนตร์ (Cinematic)' },
    { id: 'Nature', label: 'ธรรมชาติ (Nature)' },
    { id: 'Luxury', label: 'หรูหรา (Luxury)' },
    { id: 'Vibrant/Neon', label: 'สดใส/นีออน (Vibrant)' },
    { id: 'Industrial', label: 'ดิบเท่ (Industrial)' },
    { id: 'Vintage', label: 'วินเทจ (Vintage)' },
    { id: 'Futuristic', label: 'ล้ำยุค (Futuristic)' },
    { id: 'Pastel', label: 'พาสเทล (Pastel)' },
  ];

  // Perspectives
  const perspectives = [
    { id: 'Front View', label: 'หน้าตรง (Front)' },
    { id: 'Side View', label: 'ด้านข้าง (Side)' },
    { id: 'Top Down', label: 'มุมบน (Top View)' },
    { id: '45 Degree Angle', label: 'มุมเฉียง 45°' },
    { id: 'Low Angle', label: 'มุมเสย (Low Angle)' },
    { id: 'Close Up', label: 'ซูมใกล้ (Macro)' },
    { id: 'Isometric', label: 'ไอโซเมตริก (Iso)' },
    { id: 'In Context', label: 'ขณะใช้งาน (In Use)' },
  ];

  const getAiPrompts = async () => {
    if (!productName.trim()) return;
    setIsSuggesting(true);
    setSuggestedPrompts([]);
    setSelectedPrompt(''); // Clear previous selection

    const prompt = `
      Create 10 high-quality, professional AI image generation prompts that describe a SCENE, BACKGROUND, or COMPOSITION suitable for a product in the "${category}" category.
      Target Style/Mood: "${targetStyle}".
      Perspective/View: "${perspective}".
      
      Instructions:
      - **DO NOT include the specific product name "${productName}" in the prompts.**
      - Focus entirely on the lighting, background materials, atmosphere, and camera settings.
      - The prompts should be reusable templates (e.g., "Placed on a wooden table, warm sunlight, bokeh background").
      - Include technical keywords like "4k", "high detailed", "photorealistic".
      - Keep concise (15-30 words).
      - Provide a Thai translation.
      
      **Return strictly a JSON Array of objects**:
      [
        { "en": "English scene description...", "th": "คำบรรยายฉากภาษาไทย..." },
        ...
      ]
    `;

    try {
        const textResult = await callGeminiText(prompt);
        if (textResult) {
            const jsonString = textResult.replace(/```json|```/g, '').trim();
            const prompts = JSON.parse(jsonString);
            if (Array.isArray(prompts)) {
                setSuggestedPrompts(prompts);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsSuggesting(false);
    }
  };

  const generateImage = async () => {
    // Use selected prompt if available, otherwise use input text directly
    let activePrompt = selectedPrompt || productName;
    
    if (!activePrompt.trim()) activePrompt = productName;

    // Prepend product name if using Text-to-Image and not present
    if (uploadedImages.length === 0 && productName && !activePrompt.toLowerCase().includes(productName.toLowerCase())) {
        activePrompt = `${productName}, ${activePrompt}`;
    }

    setIsGenerating(true);
    setImageResult(null);

    let base64Image = null;

    // Check if there are any uploaded images
    if (uploadedImages.length > 0) {
        // Use Image-to-Image with ALL uploaded images
        if (preserveProduct) {
             activePrompt = `(Strictly preserve the main product objects from the input images. Do not change their shape, color, logo, or details. Keep the products exactly as is. Compose them naturally into the scene. Only modify the background to be ${activePrompt}). The products must look identical to the originals.`;
        }
        // Pass the entire array of images
        base64Image = await callGeminiImageToImage(activePrompt, uploadedImages);
    } else {
        // Use Text-to-Image otherwise
        base64Image = await callGeminiImage(activePrompt);
    }

    setImageResult(base64Image);
    setIsGenerating(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
       // Allow multiple
       Promise.all(files.map(file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
       }))).then(results => {
          setUploadedImages(prev => [...prev, ...results]);
       });
    }
  };

  const removeUploadedImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  }

  const clearUploadedImages = () => {
    setUploadedImages([]);
  }

  const downloadImage = () => {
    if (imageResult) {
      const link = document.createElement('a');
      link.href = imageResult;
      link.download = `generated-product-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-indigo-600" /> สร้างรูปสินค้า (AI Pro Mode)
        </h3>

        {/* Step 1: Input Product & Category */}
        <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
            <InputGroup 
                label="ชื่อสินค้าของคุณ" 
                value={productName} 
                onChange={setProductName} 
                placeholder="เช่น ครีมกันแดด, หูฟังไร้สาย" 
            />
            
            {/* Category Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่สินค้า</label>
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${category === cat.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Style Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">สไตล์ภาพ (Mood & Tone)</label>
                <div className="flex flex-wrap gap-2">
                    {styles.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setTargetStyle(s.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${targetStyle === s.id ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300'}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Perspective Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">มุมมองภาพ (Perspective)</label>
                <div className="flex flex-wrap gap-2">
                    {perspectives.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setPerspective(p.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${perspective === p.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <Button onClick={getAiPrompts} disabled={isSuggesting || !productName} variant="secondary" className="w-full text-indigo-600 bg-white border border-indigo-200 hover:bg-indigo-50 mt-2">
                {isSuggesting ? <Loader2 className="animate-spin" size={16}/> : <Wand2 size={16}/>} 
                {isSuggesting ? 'AI กำลังคิดสูตร...' : 'ขอ 10 สูตร Prompt ยอดนิยม'}
            </Button>
        </div>

        {/* Step 2: Select Prompt OR Edit Custom */}
        {suggestedPrompts.length > 0 && (
            <div className="space-y-2 animate-fade-in">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">เลือก Prompt ที่ชอบ (มีคำแปลไทย)</label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {suggestedPrompts.map((p, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedPrompt(p.en)}
                            className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${selectedPrompt === p.en ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                        >
                            <div className="font-medium mb-1 text-sm">{p.th}</div>
                            <div className={`text-[10px] ${selectedPrompt === p.en ? 'text-indigo-200' : 'text-slate-400'}`}>{p.en}</div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Manual/Selected Prompt Edit Area */}
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prompt ภาษาอังกฤษ (ใช้สร้างจริง)</label>
            <textarea
                className="w-full p-3 bg-white border border-slate-200 rounded-lg h-20 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                placeholder={productName ? `รอเลือก Prompt ด้านบน หรือพิมพ์เอง (ภาษาอังกฤษ)...` : `ใส่ชื่อสินค้าด้านบนก่อน...`}
            ></textarea>
        </div>

        {/* Image Upload Area */}
        <div>
            <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-slate-700">ภาพต้นแบบ (Optional)</label>
                {uploadedImages.length > 0 && <button onClick={clearUploadedImages} className="text-xs text-red-500 hover:underline">ลบทั้งหมด</button>}
            </div>
            
            <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-2 pb-2">
                    <Upload className="w-5 h-5 mb-1 text-slate-400" />
                    <p className="text-xs text-slate-500">อัปโหลดภาพสินค้า (JPG/PNG)</p>
                </div>
                <input type="file" className="hidden" multiple accept="image/*" onChange={handleImageUpload} />
            </label>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                    {uploadedImages.map((img, index) => (
                        <div key={index} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                            <img src={img} alt={`uploaded-${index}`} className="w-full h-full object-cover" />
                            <button 
                                onClick={() => removeUploadedImage(index)}
                                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Preserve Product Toggle */}
            {uploadedImages.length > 0 && (
            <div 
                onClick={() => setPreserveProduct(!preserveProduct)}
                className={`mt-3 flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${preserveProduct ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}
            >
                <div className="flex items-center gap-2">
                    <Lock size={14} className={preserveProduct ? 'text-green-600' : 'text-slate-400'} />
                    <div className="flex flex-col">
                        <span className={`text-xs font-medium ${preserveProduct ? 'text-green-700' : 'text-slate-500'}`}>
                            คงสภาพสินค้าเดิม 100% (Strict Mode)
                        </span>
                        <span className="text-[10px] text-slate-400">ห้าม AI เปลี่ยนแปลงตัวสินค้า (ใช้ภาพจริงแปะลงฉาก)</span>
                    </div>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-colors ${preserveProduct ? 'bg-green-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${preserveProduct ? 'left-4.5' : 'left-0.5'}`} style={{left: preserveProduct ? '18px' : '2px'}}></div>
                </div>
            </div>
            )}
        </div>

        <Button onClick={generateImage} disabled={isGenerating || (!selectedPrompt && !productName)} className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-lg shadow-indigo-200">
          {isGenerating ? <><Loader2 className="animate-spin" size={16}/> กำลัง{uploadedImages.length > 0 ? 'ดัดแปลง' : 'วาด'}ภาพ...</> : <><Sparkles size={16}/> {uploadedImages.length > 0 ? 'สร้างจากภาพนี้' : 'สร้างรูปใหม่'}</>}
        </Button>
      </div>

      {/* Result Area */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-4 min-h-[400px] relative overflow-hidden">
        {imageResult ? (
          <div className="relative group w-full h-full flex items-center justify-center">
            <img src={imageResult} alt="Generated Product" className="max-w-full max-h-full object-contain rounded-lg shadow-md animate-fade-in" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
               <button onClick={downloadImage} className="bg-white text-slate-800 px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-slate-100">
                 <Download size={16} /> ดาวน์โหลด
               </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 opacity-60">
             {isGenerating ? (
               <div className="flex flex-col items-center animate-pulse">
                 <Sparkles size={48} className="mb-2 text-indigo-400" />
                 <p>AI กำลังสร้างสรรค์ผลงาน...</p>
               </div>
             ) : (
               <>
                 <ImageIcon size={48} className="mb-2 mx-auto" />
                 <p>เลือกสูตร Prompt แล้วกดสร้าง<br/>เพื่อดูรูปสินค้าของคุณ</p>
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Feature 7: Video Script Generator (NEW REPLACEMENT) ---

const VideoScriptGenerator = () => {
    const [productName, setProductName] = useState('');
    const [platform, setPlatform] = useState('TikTok');
    const [duration, setDuration] = useState('15s');
    const [tone, setTone] = useState('Fun & Viral');
    const [sellingPoint, setSellingPoint] = useState('');
    const [generatedScript, setGeneratedScript] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateScript = async () => {
        if (!productName) return;
        setIsGenerating(true);
        
        const prompt = `
            Act as a Creative Director for Short Video Content (TikTok, Reels, Shorts).
            Write a viral video script for:
            - Product: ${productName}
            - Selling Point: ${sellingPoint}
            - Platform: ${platform}
            - Duration: ${duration}
            - Tone: ${tone}
            
            The output must be in Thai Language.
            Structure the response as a clear table or list with columns:
            1. Time (0:00-0:03, etc)
            2. Visual (Camera angle, Action, Text overlay)
            3. Audio (Voiceover/Dialogue/Sound Effect)
            
            Include a "Hook" in the first 3 seconds.
            Include a "Call to Action" at the end.
        `;

        try {
            const result = await callGeminiText(prompt);
            setGeneratedScript(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyScript = () => {
        if (generatedScript) {
            navigator.clipboard.writeText(generatedScript);
        }
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 h-full">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Video className="w-5 h-5 text-red-500" /> เขียนบทวิดีโอสั้น
                </h3>
                
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 space-y-3">
                    <InputGroup label="สินค้าที่ต้องการขาย" value={productName} onChange={setProductName} placeholder="เช่น แก้วเก็บความเย็น" />
                    <InputGroup label="จุดเด่นที่อยากโชว์" value={sellingPoint} onChange={setSellingPoint} placeholder="เช่น น้ำแข็งไม่ละลายข้ามวัน" />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">แพลตฟอร์ม</label>
                            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full p-2 text-sm border rounded">
                                <option value="TikTok">TikTok</option>
                                <option value="Reels">Instagram Reels</option>
                                <option value="Shorts">YouTube Shorts</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">ความยาว</label>
                            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-2 text-sm border rounded">
                                <option value="15s">15 วินาที (กระชับ)</option>
                                <option value="30s">30 วินาที (มาตรฐาน)</option>
                                <option value="60s">60 วินาที (เล่าเรื่อง)</option>
                            </select>
                        </div>
                    </div>
                     <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">สไตล์คลิป</label>
                            <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full p-2 text-sm border rounded">
                                <option value="Fun & Viral">ตลก สนุก ไวรัล</option>
                                <option value="Storytelling">เล่าเรื่อง ซึ้งๆ อินๆ</option>
                                <option value="ASMR/Satisfying">ASMR / เพลินตา</option>
                                <option value="Hard Sell">เน้นขายตรง โปรแรง</option>
                                <option value="Educational">ให้ความรู้ How-to</option>
                            </select>
                        </div>
                    
                    <Button onClick={generateScript} disabled={isGenerating || !productName} className="w-full bg-red-600 hover:bg-red-700 text-white shadow-red-200">
                         {isGenerating ? <Loader2 className="animate-spin" size={16}/> : <PlayCircle size={16}/>} เขียนบทให้ฉัน (Generate Script)
                    </Button>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full min-h-[400px] overflow-hidden flex flex-col">
                {generatedScript ? (
                    <>
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200">
                             <h4 className="font-bold text-slate-700">บทวิดีโอ (Video Script)</h4>
                             <button onClick={copyScript} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-white"><Copy size={16}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                             <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
                                 {generatedScript}
                             </div>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <Video size={48} className="mb-2" />
                        <p>กรอกข้อมูลด้านซ้ายเพื่อเริ่มเขียนบท</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState('pricing');

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 selection:bg-blue-100">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShoppingBag className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
              SellerPro AI
            </h1>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Powered by Gemini
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-full md:w-auto overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'pricing' 
                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Calculator size={16} />
            คำนวณราคาขาย
          </button>
          <button
            onClick={() => setActiveTab('promo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'promo' 
                ? 'bg-pink-50 text-pink-700 shadow-sm ring-1 ring-pink-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Percent size={16} />
            วางแผนโปรฯ
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'content' 
                ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={16} />
            AI วิเคราะห์สินค้า
          </button>
          <button
            onClick={() => setActiveTab('ads')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'ads' 
                ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <TrendingUp size={16} />
            วางแผน Ads
          </button>
          <button
            onClick={() => setActiveTab('reply')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'reply' 
                ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <MessageCircle size={16} />
            ช่วยตอบแชท
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'image' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <ImageIcon size={16} />
            สร้างรูปสินค้า
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'video' 
                ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Video size={16} />
            เขียนบทวิดีโอ
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="animate-fade-in-up">
          <Card className="p-6 md:p-8 min-h-[500px]">
            {activeTab === 'pricing' && <PriceCalculator />}
            {activeTab === 'promo' && <PromoPlanner />}
            {activeTab === 'content' && <ContentGenerator />}
            {activeTab === 'ads' && <AdOptimizer />}
            {activeTab === 'reply' && <SmartReply />}
            {activeTab === 'image' && <ImageGenerator />}
            {activeTab === 'video' && <VideoScriptGenerator />}
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-400 text-sm">
          <p>SellerPro AI © 2024 - เครื่องมือช่วยผู้ขายออนไลน์</p>
          <p className="text-xs mt-1 opacity-70">ผลลัพธ์จากการคำนวณเป็นเพียงการคาดการณ์ ควรตรวจสอบกับ Platform จริงอีกครั้ง</p>
        </div>

      </main>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animation-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        /* Custom Scrollbar for dark theme area */
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}