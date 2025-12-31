import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Sparkles, TrendingUp, Copy, Check, Info, DollarSign, Package, AlertCircle, ShoppingBag, Landmark, BrainCircuit, Loader2, Save, RotateCcw, Swords, Target, Megaphone, Users, Share2, LayoutList, ArrowRightLeft, Percent, Calendar, BarChart3, Plus, Trash2, Tag, MessageSquare, Send, MessageCircle, Star, ThumbsUp, Truck, Image as ImageIcon, Download, Upload, X, Wand2, Palette, Camera, Lock, Type, Video, PlayCircle, Settings, Key, PieChart, TrendingDown } from 'lucide-react';

// --- Gemini API Helpers (Updated to accept Key) ---

const callGeminiText = async (prompt, userKey) => {
  if (!userKey) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${userKey}`,
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

const callGeminiImage = async (prompt, userKey) => {
  if (!userKey) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${userKey}`,
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

const callGeminiImageToImage = async (prompt, base64Images, userKey) => {
  if (!userKey) return null;
  try {
    const parts = [{ text: prompt }];
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];

    images.forEach(img => {
        const base64Data = img.split(',')[1];
        const mimeType = img.split(';')[0].split(':')[1];
        parts.push({ inlineData: { mimeType: mimeType, data: base64Data } });
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${userKey}`,
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
  const [calcMode, setCalcMode] = useState('find_price');
  const [cost, setCost] = useState('');
  const [targetProfit, setTargetProfit] = useState('');
  const [profitType, setProfitType] = useState('amount');
  const [inputPrice, setInputPrice] = useState('');
  const [commissionFee, setCommissionFee] = useState(7.49);
  const [transactionFee, setTransactionFee] = useState(3.21);
  const [serviceFee, setServiceFee] = useState(7.49);
  const [fixedFee, setFixedFee] = useState(1);
  const [isVatRegistered, setIsVatRegistered] = useState(false);
  const [competitorPrice, setCompetitorPrice] = useState('');
  const [shippingCost, setShippingCost] = useState(0); 
  const [result, setResult] = useState(null);

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
    const vatRateDecimal = isVatRegistered ? (7 / 107) : 0; 
    let sellingPrice = 0;
    let actualProfit = 0;

    if (calcMode === 'find_price') {
        const profitNum = parseFloat(targetProfit) || 0;
        let desiredProfitAmount = 0;
        if (profitType === 'amount') desiredProfitAmount = profitNum;
        else desiredProfitAmount = costNum * (profitNum / 100);
        const totalCost = costNum + shipNum;
        const totalVariableRate = (commFeeRate + transFeeRate + servFeeRate) / 100;
        const denominator = 1 - totalVariableRate - vatRateDecimal;
        if (denominator <= 0) return;
        sellingPrice = (totalCost + desiredProfitAmount + fixedFeeAmt) / denominator;
    } else {
        sellingPrice = parseFloat(inputPrice) || 0;
    }

    const commAmt = sellingPrice * (commFeeRate / 100);
    const transAmt = sellingPrice * (transFeeRate / 100);
    const servAmt = sellingPrice * (servFeeRate / 100);
    const vatAmt = sellingPrice * vatRateDecimal;
    const totalDeduction = commAmt + transAmt + servAmt + fixedFeeAmt + vatAmt;
    const netReceive = sellingPrice - totalDeduction - shipNum;
    actualProfit = netReceive - costNum;

    let compAnalysis = null;
    if (competitorPrice) {
      const compPriceNum = parseFloat(competitorPrice);
      const diff = sellingPrice - compPriceNum;
      const percentDiff = (diff / compPriceNum) * 100;
      if (diff > 0) compAnalysis = { status: 'expensive', text: `แพงกว่าคู่แข่ง ${percentDiff.toFixed(1)}%`, color: 'text-red-500' };
      else if (diff < 0) compAnalysis = { status: 'cheaper', text: `ถูกกว่าคู่แข่ง ${Math.abs(percentDiff).toFixed(1)}%`, color: 'text-green-500' };
      else compAnalysis = { status: 'equal', text: 'ราคาเท่าคู่แข่งเป๊ะ', color: 'text-yellow-500' };
    }

    setResult({
      price: sellingPrice,
      breakdown: { comm: commAmt, trans: transAmt, serv: servAmt, fixed: fixedFeeAmt, vat: vatAmt, totalFees: totalDeduction },
      actualProfit: actualProfit,
      margin: sellingPrice > 0 ? (actualProfit / sellingPrice) * 100 : 0,
      compAnalysis: compAnalysis
    });
  };

  const resetSettings = () => {
      setCommissionFee(7.49); setTransactionFee(3.21); setServiceFee(7.49); setFixedFee(1); setIsVatRegistered(false);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-600" /> คำนวณต้นทุน & กำไร</h3>
        <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mb-4">
            <button onClick={() => { setCalcMode('find_price'); setResult(null); }} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${calcMode === 'find_price' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Target size={16} /> หา "ราคาขาย"</button>
            <button onClick={() => { setCalcMode('check_profit'); setResult(null); }} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all ${calcMode === 'check_profit' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><DollarSign size={16} /> เช็ค "กำไร"</button>
        </div>
        <InputGroup label="ต้นทุนสินค้า (COGS)" type="number" prefix="฿" value={cost} onChange={setCost} placeholder="0.00" />
        {calcMode === 'find_price' ? (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
                <InputGroup label={profitType === 'amount' ? "กำไรที่ต้องการ (บาท)" : "กำไร (%)"} type="number" prefix={profitType === 'amount' ? "฿" : "%"} value={targetProfit} onChange={setTargetProfit} />
                <div className="mt-7"><select value={profitType} onChange={(e) => setProfitType(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg"><option value="amount">บาท (ต่อชิ้น)</option><option value="percent">% (จากต้นทุน)</option></select></div>
            </div>
        ) : (
            <div className="animate-fade-in"><InputGroup label="ราคาขายที่ตั้งไว้" type="number" prefix="฿" value={inputPrice} onChange={setInputPrice} /></div>
        )}
        <div className="grid grid-cols-2 gap-4"><InputGroup label="ต้นทุนแฝง/ค่ากล่อง" prefix="฿" value={shippingCost} onChange={setShippingCost} /><InputGroup label="ราคาคู่แข่ง (ถ้ามี)" prefix="฿" value={competitorPrice} onChange={setCompetitorPrice} /></div>
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-100 space-y-3 relative group">
          <div className="flex justify-between items-center"><h4 className="text-sm font-bold text-orange-800 flex items-center gap-2"><ShoppingBag size={14}/> ค่าธรรมเนียม Shopee (Auto-Save)</h4><button onClick={resetSettings} className="text-xs text-orange-400 hover:text-orange-600 flex items-center gap-1"><RotateCcw size={10} /> รีเซ็ต</button></div>
          <div className="grid grid-cols-2 gap-3"><InputGroup label="ค่าการขาย (Comm.)" suffix="%" value={commissionFee} onChange={setCommissionFee} /><InputGroup label="ค่าธุรกรรม (Trans.)" suffix="%" value={transactionFee} onChange={setTransactionFee} /></div>
          <div className="grid grid-cols-2 gap-3"><InputGroup label="ส่งฟรี+โค้ดคุ้ม" suffix="%" value={serviceFee} onChange={setServiceFee} /><InputGroup label="ค่าคงที่ (บาท/ออเดอร์)" prefix="฿" value={fixedFee} onChange={setFixedFee} /></div>
        </div>
        <div className={`p-4 rounded-lg border transition-all ${isVatRegistered ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Landmark size={18} className={isVatRegistered ? "text-blue-600" : "text-slate-400"} /><span className={`text-sm font-medium ${isVatRegistered ? "text-blue-800" : "text-slate-600"}`}>จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)</span></div><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={isVatRegistered} onChange={(e) => setIsVatRegistered(e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label></div>
        </div>
        <Button onClick={calculateResult} className={`w-full shadow-lg ${calcMode === 'find_price' ? 'shadow-blue-200' : 'shadow-green-200 from-green-600 to-teal-600'}`}>{calcMode === 'find_price' ? 'คำนวณราคาขาย' : 'คำนวณกำไรสุทธิ'}</Button>
      </div>
      <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col justify-center relative overflow-hidden">
        {result ? (
          <div className="relative z-10 space-y-4 animation-fade-in">
            <div className="text-center pb-4 border-b border-slate-700">
              <p className="text-slate-400 text-sm mb-1">{calcMode === 'find_price' ? 'ราคาขายที่แนะนำ' : 'ราคาขายของคุณ'}</p>
              <h2 className="text-5xl font-bold text-green-400">฿{result.price.toLocaleString(undefined, {maximumFractionDigits: 0})}</h2>
              {result.compAnalysis && <div className={`mt-2 text-sm font-bold flex items-center justify-center gap-2 ${result.compAnalysis.color}`}><Swords size={16} /> {result.compAnalysis.text}</div>}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-orange-300 font-medium pt-1 pb-1 border-b border-slate-700/50 mb-1"><span>รวมค่าธรรมเนียมทั้งหมด</span><span>-฿{result.breakdown.totalFees.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></div>
              <div className={`p-3 rounded-lg mt-3 flex justify-between items-center border ${result.actualProfit > 0 ? 'bg-slate-800/50 border-slate-700' : 'bg-red-900/20 border-red-800'}`}>
                <span className={result.actualProfit > 0 ? "text-blue-300 font-semibold" : "text-red-300 font-semibold"}>{result.actualProfit > 0 ? 'กำไรสุทธิ' : 'ขาดทุน'}</span>
                <div className="text-right"><div className={`text-xl font-bold ${result.actualProfit > 0 ? "text-blue-300" : "text-red-400"}`}>{result.actualProfit > 0 ? '+' : ''}฿{result.actualProfit.toLocaleString(undefined, {maximumFractionDigits: 2})}</div><div className="text-xs text-slate-400">Margin: {result.margin.toFixed(2)}%</div></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 relative z-10"><Package className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>กรอกข้อมูลต้นทุนด้านซ้าย</p></div>
        )}
      </div>
    </div>
  );
};

// --- Feature 2: AI Content Generator (Pro Mode) ---

const ContentGenerator = ({ apiKey, onConfigKey }) => {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [features, setFeatures] = useState('');
  const [brand, setBrand] = useState('');
  const [contentType, setContentType] = useState('listing');
  const [tone, setTone] = useState('friendly');
  const [targetAudience, setTargetAudience] = useState('');
  const [shopInfo, setShopInfo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const savedShopInfo = localStorage.getItem('sellerProShopInfo');
    if (savedShopInfo) setShopInfo(savedShopInfo);
  }, []);

  useEffect(() => {
    localStorage.setItem('sellerProShopInfo', shopInfo);
  }, [shopInfo]);

  const generateContent = async () => {
    if (!apiKey) { setError('กรุณาตั้งค่า API Key ที่มุมขวาบนก่อนใช้งานครับ'); return; }
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
        prompt = `You are a top E-commerce copywriter (Shopee/Lazada). Product: ${productName}, Category: ${category}, Brand: ${brand}, Features: ${features}, Target: ${targetAudience}, Shop Info: ${shopInfo}. Tone: ${toneMap[tone]}. Task: Write a Listing Description. 1. SEO Title (Keywords, Emoji). 2. Description (Pain point, Solution, Specs, Box content, Warranty, Shop Info). 3. Hashtags. JSON Response: { "title": "...", "description": "...", "hashtags": "..." }`;
    } else {
        prompt = `You are a Social Media Content Creator. Product: ${productName}, Features: ${features}, Target: ${targetAudience}, Tone: ${toneMap[tone]}. Task: Write a Social Post. 1. Headline/Hook. 2. Caption (Storytelling, Emotion, CTA). 3. Hashtags. JSON Response: { "title": "...", "description": "...", "hashtags": "..." }`;
    }

    try {
      const textResult = await callGeminiText(prompt, apiKey);
      if (!textResult) throw new Error("No response from AI");
      const jsonString = textResult.replace(/```json|```/g, '').trim();
      setGeneratedContent(JSON.parse(jsonString));
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาด หรือ API Key ไม่ถูกต้อง");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
         <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> ข้อมูลสินค้า (Gemini Pro Mode)</h3>
         <div className="bg-slate-100 p-1 rounded-lg flex gap-1 mb-2">
            <button onClick={() => setContentType('listing')} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${contentType === 'listing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><LayoutList size={16} /> ลงขาย</button>
            <button onClick={() => setContentType('social')} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${contentType === 'social' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}><Share2 size={16} /> โพสต์</button>
        </div>
        <InputGroup label="ชื่อสินค้า" value={productName} onChange={setProductName} />
        <div className="grid grid-cols-2 gap-4"><InputGroup label="หมวดหมู่" value={category} onChange={setCategory} /><InputGroup label="แบรนด์" value={brand} onChange={setBrand} /></div>
        <div className="grid grid-cols-2 gap-4">
           {contentType === 'social' && <div><label className="block text-sm font-medium text-slate-700 mb-1">สไตล์</label><select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg"><option value="friendly">😊 เป็นกันเอง</option><option value="professional">👔 ทางการ</option><option value="urgent">🔥 ตื่นเต้น</option></select></div>}
           <div className={contentType === 'listing' ? 'col-span-2' : ''}><InputGroup label="กลุ่มเป้าหมาย" value={targetAudience} onChange={setTargetAudience} /></div>
        </div>
        <div><label className="block text-sm font-medium text-slate-700 mb-1">จุดเด่น/คีย์เวิร์ด</label><textarea className="w-full p-3 bg-slate-50 border rounded-lg h-24" value={features} onChange={(e) => setFeatures(e.target.value)}></textarea></div>
        {contentType === 'listing' && <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><label className="block text-sm font-medium text-slate-700 mb-1"><Save size={14} /> ข้อมูลร้านค้า (Auto-Save)</label><textarea className="w-full p-2 bg-white border rounded-lg h-20 text-sm" value={shopInfo} onChange={(e) => setShopInfo(e.target.value)}></textarea></div>}
        <Button onClick={generateContent} disabled={isGenerating || !productName} className={`w-full bg-gradient-to-r ${contentType === 'listing' ? 'from-purple-600 to-indigo-600' : 'from-pink-500 to-orange-500'}`}>{isGenerating ? 'กำลังสร้าง...' : '✨ สร้างคอนเทนต์'}</Button>
        {!apiKey && <button onClick={onConfigKey} className="text-xs text-red-500 mt-1 w-full text-center hover:underline">*กรุณาตั้งค่า API Key (คลิก)</button>}
      </div>
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 h-full max-h-[600px] overflow-y-auto min-h-[300px]">
        {generatedContent ? (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold px-2 py-1 rounded text-green-600 bg-green-50">{contentType === 'listing' ? 'Title' : 'Headline'}</span><button onClick={() => copyToClipboard(generatedContent.title)} className="text-slate-400 hover:text-blue-500"><Copy size={14}/></button></div><p className="font-medium text-slate-800">{generatedContent.title}</p>
             </div>
             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">Description</span><button onClick={() => copyToClipboard(generatedContent.description)} className="text-slate-400 hover:text-blue-500"><Copy size={14}/></button></div><pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans">{generatedContent.description}</pre>
             </div>
             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">Hashtags</span><button onClick={() => copyToClipboard(generatedContent.hashtags)} className="text-slate-400 hover:text-blue-500"><Copy size={14}/></button></div><p className="text-blue-500 text-sm">{generatedContent.hashtags}</p>
             </div>
          </div>
        ) : <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">{isGenerating ? <Loader2 className="animate-spin mb-2" size={48} /> : <Sparkles size={48} className="mb-2" />}<p>AI รอสร้างเนื้อหาให้คุณอยู่...</p></div>}
      </div>
    </div>
  );
};

// --- Feature 3: Ad Optimizer ---

const AdOptimizer = ({ apiKey, onConfigKey }) => {
  const [productPrice, setProductPrice] = useState('');
  const [profitPerPcs, setProfitPerPcs] = useState('');
  const [conversionRate, setConversionRate] = useState(2);
  const [adGoal, setAdGoal] = useState('profit'); 
  const [aiAdvice, setAiAdvice] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const breakevenCPC = parseFloat(profitPerPcs) * (parseFloat(conversionRate) / 100);
  const breakevenROAS = parseFloat(productPrice) / parseFloat(profitPerPcs);
  
  const analyzeWithAI = async () => {
    if (!productPrice || !profitPerPcs) return;
    if (!apiKey) { onConfigKey(); return; }
    setIsAnalyzing(true);
    const goalMap = { profit: 'เน้นกำไร (ROI)', sales: 'เน้นยอดขาย (Volume)', awareness: 'เน้นการมองเห็น' };
    const prompt = `Analyze Ads Strategy. Product Price: ${productPrice}, Profit/unit: ${profitPerPcs}, Target CR: ${conversionRate}%, Goal: ${goalMap[adGoal]}. Provide 1. Risk Analysis 2. Bidding Strategy 3. Budget Advice 4. Special Tip. In Thai.`;
    try {
        const result = await callGeminiText(prompt, apiKey);
        setAiAdvice(result);
    } catch(e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
           <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-orange-600" /> คำนวณงบโฆษณา</h3>
           <div className="space-y-4">
             <InputGroup label="ราคาขาย" prefix="฿" value={productPrice} onChange={setProductPrice} />
             <InputGroup label="กำไรต่อชิ้น" prefix="฿" value={profitPerPcs} onChange={setProfitPerPcs} />
             <div className="grid grid-cols-2 gap-4">
                <InputGroup label="CR (%)" suffix="%" value={conversionRate} onChange={setConversionRate} />
                <div><label className="block text-sm font-medium text-slate-700 mb-1">เป้าหมาย</label><select value={adGoal} onChange={(e) => setAdGoal(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-lg"><option value="profit">💰 เน้นกำไร</option><option value="sales">📈 เน้นยอดขาย</option><option value="awareness">👀 เน้นคนเห็น</option></select></div>
             </div>
             <Button onClick={analyzeWithAI} disabled={isAnalyzing || !productPrice || !profitPerPcs} className="w-full bg-gradient-to-r from-orange-500 to-red-500">{isAnalyzing ? 'AI กำลังคิด...' : 'ขอคำแนะนำจาก AI'}</Button>
             {!apiKey && <button onClick={onConfigKey} className="text-xs text-red-500 mt-1 w-full text-center hover:underline">*กรุณาตั้งค่า API Key (คลิก)</button>}
          </div>
        </div>
        <div className="space-y-4">
           {/* Breakeven cards reused from previous logic but simplified for brevity in this merged file */}
           <div className="bg-orange-50 border border-orange-100 p-5 rounded-xl"><h4 className="font-semibold text-orange-900 mb-2">💡 Max CPC (เท่าทุน)</h4><div className="text-3xl font-bold text-orange-600">฿{isNaN(breakevenCPC) ? '0.00' : breakevenCPC.toFixed(2)}</div></div>
           <div className="bg-blue-50 border border-blue-100 p-5 rounded-xl"><h4 className="font-semibold text-blue-900 mb-2">🎯 Min ROAS</h4><div className="text-3xl font-bold text-blue-600">{isNaN(breakevenROAS) || !isFinite(breakevenROAS) ? '0.00' : breakevenROAS.toFixed(2)}</div></div>
        </div>
      </div>
      {aiAdvice && <div className="bg-white border border-indigo-100 rounded-xl p-6 shadow-sm"><h4 className="font-bold text-indigo-900 mb-3">คำแนะนำจาก AI</h4><div className="prose prose-sm text-slate-700 whitespace-pre-line">{aiAdvice}</div></div>}
    </div>
  );
};

// --- Feature 4: Promo Planner (Professional & Strategic) ---

const PromoPlanner = ({ apiKey, onConfigKey }) => {
  const [promoItems, setPromoItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  
  // Strategic Inputs
  const [targetTotalProfit, setTargetTotalProfit] = useState('');
  const [duration, setDuration] = useState('7');
  const [budget, setBudget] = useState('');
  const [strategy, setStrategy] = useState('profit'); // profit, clearance, new_launch
  const [platform, setPlatform] = useState('Shopee');
  
  const [aiPlan, setAiPlan] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('plan'); 
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'สวัสดีครับ ผมช่วยวางแผนโปรโมชั่นระดับกลยุทธ์ได้ครับ ลองเพิ่มสินค้าและบอกเป้าหมายมาได้เลย' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { if (aiPlan) setActiveRightTab('plan'); }, [aiPlan]);

  const addItem = () => {
    if (!newItemName || !newItemCost || !newItemPrice) return;
    setPromoItems([...promoItems, { id: Date.now(), name: newItemName, cost: parseFloat(newItemCost), price: parseFloat(newItemPrice) }]);
    setNewItemName(''); setNewItemCost(''); setNewItemPrice('');
  };

  const generatePlanWithAI = async () => {
    if (promoItems.length === 0 || !targetTotalProfit) return;
    if (!apiKey) { onConfigKey(); return; }
    setIsPlanning(true);

    const itemsContext = promoItems.map(item => 
        `- ${item.name}: Cost ${item.cost}, Normal Price ${item.price}, Margin: ${((item.price - item.cost)/item.price * 100).toFixed(1)}%`
    ).join('\n');

    const strategies = {
        'profit': 'เน้นกำไรสูงสุด (Profit Maximization)',
        'clearance': 'ล้างสต็อก (Inventory Clearance)',
        'new_launch': 'เปิดตัวสินค้าใหม่/ดึงลูกค้า (Traffic Generation)'
    };

    const prompt = `
      Act as a Senior Marketing Analyst & Strategist.
      
      Campaign Context:
      - Platform: ${platform}
      - Duration: ${duration} Days
      - Goal: Net Profit Target of ${targetTotalProfit} THB
      - Strategy: ${strategies[strategy]}
      - Marketing Budget: ${budget || '0'} THB
      
      Product Portfolio:
      ${itemsContext}
      
      Task:
      1. Analyze the portfolio to find "Hero Products" (Traffic Drivers) vs "Profit Generators".
      2. Suggest optimal Discount % for each item based on the selected Strategy.
      3. Forecast Sales Units required to meet the ${targetTotalProfit} profit goal (considering the budget as cost).
      
      Return strictly JSON format:
      {
        "executive_summary": "Short strategic overview...",
        "kpi_forecast": {
            "total_revenue": 0,
            "total_profit": 0,
            "roi": 0
        },
        "items": [
          { 
            "name": "...", 
            "role": "Hero / Profit / Standard",
            "recommended_discount": 10, 
            "promo_price": 100, 
            "estimated_margin_percent": 20,
            "target_units_total": 50, 
            "target_units_daily": 7,
            "reason": "..." 
          }
        ]
      }
    `;

    try {
        const textResult = await callGeminiText(prompt, apiKey);
        if (textResult) setAiPlan(JSON.parse(textResult.replace(/```json|```/g, '').trim()));
    } catch(e) { console.error(e); } finally { setIsPlanning(false); }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    if (!apiKey) { onConfigKey(); return; }
    const userText = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsChatting(true);
    const prompt = `Act as a Marketing Consultant. User asked: "${userText}". Context: ${promoItems.length} items, Strategy: ${strategy}. Answer in Thai, professional but easy to understand.`;
    try {
      const response = await callGeminiText(prompt, apiKey);
      setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (e) { setChatMessages(prev => [...prev, { role: 'ai', text: 'Error calling AI' }]); } finally { setIsChatting(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Percent className="w-5 h-5 text-pink-500" /> จัดพอร์ตสินค้า & วางแผนโปรฯ (Strategic Mode)</h3>
        
        {/* Item Input */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5"><input className="w-full p-2 text-sm border rounded-lg" placeholder="ชื่อสินค้า" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}/></div>
                <div className="col-span-3"><input type="number" className="w-full p-2 text-sm border rounded-lg" placeholder="ทุน" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)}/></div>
                <div className="col-span-3"><input type="number" className="w-full p-2 text-sm border rounded-lg" placeholder="ขายปกติ" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}/></div>
                <div className="col-span-1"><button onClick={addItem} className="bg-blue-600 text-white p-2 rounded-lg w-full"><Plus size={16} /></button></div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">{promoItems.map((item) => (<div key={item.id} className="flex justify-between p-2 bg-white rounded border text-sm"><span>{item.name}</span><span className="text-slate-400 text-xs">Margin: {((item.price-item.cost)/item.price*100).toFixed(0)}%</span><button onClick={() => setPromoItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-500"><Trash2 size={14}/></button></div>))}</div>
        </div>

        {/* Strategy Controls */}
        <div className="bg-pink-50 p-4 rounded-lg border border-pink-100 space-y-3">
           <div className="grid grid-cols-2 gap-3">
               <InputGroup label="เป้ากำไรรวม (บาท)" prefix="฿" value={targetTotalProfit} onChange={setTargetTotalProfit} />
               <InputGroup label="งบการตลาด (Ad Budget)" prefix="฿" value={budget} onChange={setBudget} />
           </div>
           <div className="grid grid-cols-2 gap-3">
                <InputGroup label="ระยะเวลา (วัน)" suffix="วัน" value={duration} onChange={setDuration} />
                <div>
                    <label className="block text-sm font-medium text-pink-800 mb-1">กลยุทธ์ (Strategy)</label>
                    <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="w-full p-2.5 text-sm border rounded-lg">
                        <option value="profit">💰 เน้นกำไร (Profit Max)</option>
                        <option value="clearance">📦 ล้างสต็อก (Clearance)</option>
                        <option value="new_launch">🚀 เปิดตัว/ดึงคน (Traffic)</option>
                    </select>
                </div>
           </div>
        </div>

        <Button onClick={generatePlanWithAI} disabled={isPlanning || promoItems.length === 0} className="w-full bg-pink-600 text-white">{isPlanning ? 'AI กำลังวิเคราะห์ข้อมูล...' : 'วิเคราะห์และวางแผน (Analyze)'}</Button>
        {!apiKey && <button onClick={onConfigKey} className="text-xs text-red-500 mt-1 w-full text-center hover:underline">*กรุณาตั้งค่า API Key (คลิก)</button>}
      </div>

      {/* Right Panel */}
      <div className="bg-slate-900 text-white rounded-xl flex flex-col relative overflow-hidden min-h-[500px]">
        <div className="flex border-b border-slate-700 bg-slate-900/50">
            <button onClick={() => setActiveRightTab('plan')} className={`flex-1 py-3 text-sm ${activeRightTab === 'plan' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-400'}`}>แผนกลยุทธ์ (Dashboard)</button>
            <button onClick={() => setActiveRightTab('chat')} className={`flex-1 py-3 text-sm ${activeRightTab === 'chat' ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-400'}`}>ปรึกษา AI</button>
        </div>
        
        {activeRightTab === 'plan' && aiPlan && (
            <div className="p-6 overflow-y-auto h-full space-y-5">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-800 p-3 rounded-lg text-center">
                        <div className="text-xs text-slate-400">ยอดขายคาดการณ์</div>
                        <div className="text-lg font-bold text-white">฿{aiPlan.kpi_forecast.total_revenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg text-center">
                        <div className="text-xs text-slate-400">กำไรสุทธิ</div>
                        <div className="text-lg font-bold text-green-400">฿{aiPlan.kpi_forecast.total_profit.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-800 p-3 rounded-lg text-center">
                        <div className="text-xs text-slate-400">ROI</div>
                        <div className="text-lg font-bold text-blue-400">{aiPlan.kpi_forecast.roi}x</div>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-bold text-pink-300 mb-2 flex items-center gap-2"><Target size={14}/> กลยุทธ์แนะนำ</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{aiPlan.executive_summary}</p>
                </div>

                {/* Item Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                        <thead className="text-xs uppercase bg-slate-800 text-slate-400">
                            <tr>
                                <th className="px-2 py-2 rounded-l">สินค้า</th>
                                <th className="px-2 py-2">Role</th>
                                <th className="px-2 py-2">ส่วนลด</th>
                                <th className="px-2 py-2">เป้าขาย</th>
                                <th className="px-2 py-2 rounded-r">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {aiPlan.items.map((item, i) => (
                                <tr key={i} className="hover:bg-slate-800/30">
                                    <td className="px-2 py-3 font-medium text-white">{item.name}</td>
                                    <td className="px-2 py-3"><span className={`px-1.5 py-0.5 rounded text-[10px] ${item.role === 'Hero' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300'}`}>{item.role}</span></td>
                                    <td className="px-2 py-3 text-red-400 font-bold">-{item.recommended_discount}%</td>
                                    <td className="px-2 py-3 text-white">{item.target_units_total} <span className="text-[10px] text-slate-500">({item.target_units_daily}/วัน)</span></td>
                                    <td className="px-2 py-3 text-green-400">{item.estimated_margin_percent}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
        
        {activeRightTab === 'chat' && (
            <div className="flex-1 flex flex-col bg-slate-900 h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">{chatMessages.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-200'}`}>{msg.text}</div></div>))}<div ref={chatEndRef}/></div>
                <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2"><input className="flex-1 bg-slate-700 text-white rounded p-2 text-sm" value={chatInput} onChange={e=>setChatInput(e.target.value)} /><button onClick={handleSendChat} className="bg-pink-600 text-white p-2 rounded"><Send size={18}/></button></div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- Feature 5: Smart Reply ---
const SmartReply = ({ apiKey, onConfigKey }) => {
    const [msg, setMsg] = useState('');
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(false);
    const gen = async () => {
        if(!apiKey) { onConfigKey(); return; }
        setLoading(true);
        const prompt = `Customer said: "${msg}". Generate 3 polite Thai replies for shop. JSON Array of strings.`;
        try { const res = await callGeminiText(prompt, apiKey); if(res) setReplies(JSON.parse(res.replace(/```json|```/g, ''))); } catch(e){} finally { setLoading(false); }
    };
    return (
        <div className="grid md:grid-cols-2 gap-6 h-full">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><MessageCircle className="w-5 h-5 text-teal-600"/> ช่วยตอบแชท</h3>
                <textarea className="w-full p-3 border rounded-lg h-32" placeholder="ลูกค้าพิมพ์ว่า..." value={msg} onChange={e=>setMsg(e.target.value)}></textarea>
                <Button onClick={gen} disabled={loading || !msg} className="w-full bg-teal-600 text-white">{loading ? 'กำลังคิด...' : 'สร้างคำตอบ'}</Button>
                {!apiKey && <button onClick={onConfigKey} className="text-xs text-red-500 mt-1 w-full text-center hover:underline">*กรุณาตั้งค่า API Key (คลิก)</button>}
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border h-full overflow-y-auto space-y-3">
                {replies.map((r,i)=><div key={i} className="bg-white p-3 rounded shadow-sm text-sm relative group"><p>{r}</p><button onClick={()=>navigator.clipboard.writeText(r)} className="absolute top-2 right-2 text-slate-300 hover:text-teal-600"><Copy size={14}/></button></div>)}
            </div>
        </div>
    )
}

// --- Feature 6: Image Generator (Pro Mode Restored) ---

const ImageGenerator = ({ apiKey, onConfigKey }) => {
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('General');
  const [targetStyle, setTargetStyle] = useState('Minimalist');
  const [perspective, setPerspective] = useState('Front View');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  const [imageResult, setImageResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]); 
  const [preserveProduct, setPreserveProduct] = useState(true);

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
    if (!apiKey) { onConfigKey(); return; }
    setIsSuggesting(true);
    setSuggestedPrompts([]);
    setSelectedPrompt('');

    const prompt = `
      Create 10 high-quality, professional AI image generation prompts for a product: "${productName}".
      Product Category: "${category}".
      Target Style/Mood: "${targetStyle}".
      Perspective/View: "${perspective}".
      
      Instructions:
      - DO NOT include the specific product name "${productName}" in the prompts (make it generic like "the product", "a bottle", etc).
      - Focus on lighting, background, and atmosphere.
      - Include technical keywords like "4k", "photorealistic".
      - Provide Thai translation.
      
      Return strictly JSON Array: [{ "en": "...", "th": "..." }, ...]
    `;

    try {
        const textResult = await callGeminiText(prompt, apiKey);
        if (textResult) {
            const jsonString = textResult.replace(/```json|```/g, '').trim();
            const prompts = JSON.parse(jsonString);
            if (Array.isArray(prompts)) setSuggestedPrompts(prompts);
        }
    } catch (e) { console.error(e); } finally { setIsSuggesting(false); }
  };

  const generateImage = async () => {
    let activePrompt = selectedPrompt || productName;
    if (!activePrompt.trim()) activePrompt = productName;
    
    // Prepend product name if using Text-to-Image and not present
    if (uploadedImages.length === 0 && productName && !activePrompt.toLowerCase().includes(productName.toLowerCase())) {
        activePrompt = `${productName}, ${activePrompt}`;
    }

    if (!apiKey) { onConfigKey(); return; }
    setIsGenerating(true);
    setImageResult(null);

    let base64Image = null;

    if (uploadedImages.length > 0) {
        if (preserveProduct) {
             activePrompt = `(Strictly preserve the main product objects from the input images. Keep the products exactly as is. Compose them naturally into the scene. Only modify the background to be ${activePrompt}).`;
        }
        base64Image = await callGeminiImageToImage(activePrompt, uploadedImages, apiKey);
    } else {
        base64Image = await callGeminiImage(activePrompt, apiKey);
    }

    setImageResult(base64Image);
    setIsGenerating(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
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
      link.download = `product-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-indigo-600" /> สร้างรูปสินค้า (Pro Mode)
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
                <label className="block text-xs font-medium text-slate-700 mb-1">หมวดหมู่สินค้า</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">สไตล์ภาพ (Mood & Tone)</label>
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
                <label className="block text-xs font-medium text-slate-700 mb-1">มุมมองภาพ (Perspective)</label>
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
            
            <Button onClick={getAiPrompts} disabled={isSuggesting || !productName} variant="secondary" className="w-full text-xs bg-white border border-slate-200 hover:bg-slate-50 mt-2">
                {isSuggesting ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} 
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
                            className={`p-2 rounded border text-xs cursor-pointer transition-all ${selectedPrompt === p.en ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                        >
                            <div className="font-medium mb-0.5">{p.th}</div>
                            <div className="text-[10px] text-slate-400 truncate">{p.en}</div>
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
                placeholder={productName ? `รอเลือก Prompt ด้านบน หรือพิมพ์เอง...` : `ใส่ชื่อสินค้าด้านบนก่อน...`}
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
                className={`mt-2 flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors border ${preserveProduct ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}
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
        {!apiKey && <button onClick={onConfigKey} className="text-xs text-red-500 mt-1 w-full text-center hover:underline">*กรุณาตั้งค่า API Key ที่มุมขวาบน</button>}
      </div>

      {/* Result Area */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center p-4 min-h-[400px] relative overflow-hidden">
        {imageResult ? (
          <div className="relative group w-full h-full flex items-center justify-center">
            <img src={imageResult} alt="Generated Product" className="max-w-full max-h-full object-contain rounded-lg shadow-md animate-fade-in" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
               <button onClick={downloadImage} className="pointer-events-auto bg-white text-slate-800 px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-slate-100">
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

// --- Feature 7: Video Script ---

const VideoScriptGenerator = ({ apiKey, onConfigKey }) => {
    const [product, setProduct] = useState('');
    const [script, setScript] = useState('');
    const [loading, setLoading] = useState(false);
    const gen = async () => {
        if(!apiKey) { onConfigKey(); return; }
        setLoading(true);
        const prompt = `Write a viral TikTok script for "${product}". Thai language. Table format: Time | Visual | Audio.`;
        try { const res = await callGeminiText(prompt, apiKey); setScript(res); } catch(e){} finally { setLoading(false); }
    }
    return (
        <div className="grid md:grid-cols-2 gap-6 h-full">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2"><Video className="w-5 h-5 text-red-500"/> เขียนบทวิดีโอ</h3>
                <InputGroup label="สินค้า" value={product} onChange={setProduct} />
                <Button onClick={gen} disabled={loading || !product} className="w-full bg-red-600 text-white">{loading ? '...' : 'เขียนบท'}</Button>
                {!apiKey && <button onClick={onConfigKey} className="text-xs text-red-500 mt-1 w-full text-center hover:underline">*กรุณาตั้งค่า API Key (คลิก)</button>}
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border h-full overflow-y-auto whitespace-pre-wrap text-sm text-slate-700">{script || 'รอผลลัพธ์...'}</div>
        </div>
    )
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState('pricing');
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('userGeminiApiKey');
    if (storedKey) setApiKey(storedKey);
  }, []);

  const saveKey = (key) => {
      setApiKey(key);
      localStorage.setItem('userGeminiApiKey', key);
      setShowKeyInput(false);
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 selection:bg-blue-100 relative">
      
      {/* API Key Modal */}
      {showKeyInput && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl animate-fade-in">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Key className="text-yellow-500"/> ตั้งค่า Gemini API Key</h3>
                  <p className="text-sm text-slate-500 mb-4">เพื่อให้แอปทำงานได้บนเว็บภายนอก กรุณาใส่ API Key ของคุณ (หาได้จาก Google AI Studio)</p>
                  <input type="password" placeholder="วาง API Key ที่นี่..." className="w-full p-3 border rounded-lg mb-4" onBlur={(e) => saveKey(e.target.value)} defaultValue={apiKey} />
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowKeyInput(false)} className="px-4 py-2 text-slate-500">ปิด</button>
                      <button onClick={() => setShowKeyInput(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">บันทึก</button>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShoppingBag className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
              SellerPro AI
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowKeyInput(true)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border ${apiKey ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}>
                 <Settings size={14} /> {apiKey ? 'API Key OK' : 'ตั้งค่า API Key'}
             </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 w-full sm:w-auto inline-flex overflow-x-auto">
          <button onClick={() => setActiveTab('pricing')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'pricing' ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}><Calculator size={16} /> คำนวณราคา</button>
          <button onClick={() => setActiveTab('promo')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'promo' ? 'bg-pink-50 text-pink-700 shadow-sm ring-1 ring-pink-200' : 'text-slate-500 hover:bg-slate-50'}`}><Percent size={16} /> วางแผนโปรฯ</button>
          <button onClick={() => setActiveTab('content')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'content' ? 'bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-200' : 'text-slate-500 hover:bg-slate-50'}`}><Sparkles size={16} /> AI วิเคราะห์</button>
          <button onClick={() => setActiveTab('ads')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'ads' ? 'bg-orange-50 text-orange-700 shadow-sm ring-1 ring-orange-200' : 'text-slate-500 hover:bg-slate-50'}`}><TrendingUp size={16} /> วางแผน Ads</button>
          <button onClick={() => setActiveTab('reply')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'reply' ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200' : 'text-slate-500 hover:bg-slate-50'}`}><MessageCircle size={16} /> ช่วยตอบแชท</button>
          <button onClick={() => setActiveTab('image')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'image' ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-500 hover:bg-slate-50'}`}><ImageIcon size={16} /> สร้างรูปสินค้า</button>
          <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'video' ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200' : 'text-slate-500 hover:bg-slate-50'}`}><Video size={16} /> เขียนบทวิดีโอ</button>
        </div>

        {/* Tab Content Area */}
        <div className="animate-fade-in-up">
          <Card className="p-6 md:p-8 min-h-[500px]">
            {activeTab === 'pricing' && <PriceCalculator />}
            {activeTab === 'promo' && <PromoPlanner apiKey={apiKey} onConfigKey={() => setShowKeyInput(true)} />}
            {activeTab === 'content' && <ContentGenerator apiKey={apiKey} onConfigKey={() => setShowKeyInput(true)} />}
            {activeTab === 'ads' && <AdOptimizer apiKey={apiKey} onConfigKey={() => setShowKeyInput(true)} />}
            {activeTab === 'reply' && <SmartReply apiKey={apiKey} onConfigKey={() => setShowKeyInput(true)} />}
            {activeTab === 'image' && <ImageGenerator apiKey={apiKey} onConfigKey={() => setShowKeyInput(true)} />}
            {activeTab === 'video' && <VideoScriptGenerator apiKey={apiKey} onConfigKey={() => setShowKeyInput(true)} />}
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
