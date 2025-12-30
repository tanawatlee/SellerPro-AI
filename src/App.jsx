import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Sparkles, TrendingUp, Copy, Check, Info, DollarSign, Package, AlertCircle, ShoppingBag, Landmark, BrainCircuit, Loader2, Save, RotateCcw, Swords, Target, Megaphone, Users, Share2, LayoutList, ArrowRightLeft, Percent, Calendar, BarChart3, Plus, Trash2, Tag, MessageSquare, Send, MessageCircle, Star, ThumbsUp, Truck, Image as ImageIcon, Download, Upload, X, Wand2, Palette, Camera, Lock, Type, Layout, Video, PlayCircle, Settings, Key } from 'lucide-react';

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

// --- Feature 2: AI Content Generator (Updated with apiKey prop) ---

const ContentGenerator = ({ apiKey }) => {
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
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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

const AdOptimizer = ({ apiKey }) => {
  const [productPrice, setProductPrice] = useState('');
  const [profitPerPcs, setProfitPerPcs] = useState('');
  const [conversionRate, setConversionRate] = useState(2);
  const [adGoal, setAdGoal] = useState('profit'); 
  const [aiAdvice, setAiAdvice] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const breakevenCPC = parseFloat(profitPerPcs) * (parseFloat(conversionRate) / 100);
  const breakevenROAS = parseFloat(productPrice) / parseFloat(profitPerPcs);
  
  const analyzeWithAI = async () => {
    if (!productPrice || !profitPerPcs || !apiKey) return;
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
             {!apiKey && <p className="text-xs text-red-500 mt-1">*ต้องใส่ API Key ก่อน</p>}
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

// --- Feature 4: Promo Planner (With Chat) ---

const PromoPlanner = ({ apiKey }) => {
  const [promoItems, setPromoItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [targetTotalProfit, setTargetTotalProfit] = useState('');
  const [duration, setDuration] = useState('7');
  const [platform, setPlatform] = useState('Shopee');
  const [aiPlan, setAiPlan] = useState(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('plan'); 
  const [chatMessages, setChatMessages] = useState([{ role: 'ai', text: 'สวัสดีครับ ผมช่วยวางแผนโปรโมชั่นได้นะ' }]);
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
    if (promoItems.length === 0 || !targetTotalProfit || !apiKey) return;
    setIsPlanning(true);
    const itemsContext = promoItems.map(item => `- ${item.name}: Cost ${item.cost}, Price ${item.price}`).join('\n');
    const prompt = `AI Campaign Manager. Platform: ${platform}. Goal Profit: ${targetTotalProfit} in ${duration} days. Items: ${itemsContext}. Plan discount strategy & sales volume. JSON Response: { "items": [{ "name": "...", "discountPercent": 10, "promoPrice": 100, "targetUnits": 50, "reason": "..." }], "summary": { "totalRevenue": 1000, "estimatedTotalProfit": 500, "strategyNote": "..." } }`;
    try {
        const textResult = await callGeminiText(prompt, apiKey);
        if (textResult) setAiPlan(JSON.parse(textResult.replace(/```json|```/g, '').trim()));
    } catch(e) { console.error(e); } finally { setIsPlanning(false); }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !apiKey) return;
    const userText = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setChatInput('');
    setIsChatting(true);
    const prompt = `Consultant for Ecommerce. User asked: ${userText}. Context: ${promoItems.length} items. Answer in Thai.`;
    try {
      const response = await callGeminiText(prompt, apiKey);
      setChatMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (e) { setChatMessages(prev => [...prev, { role: 'ai', text: 'Error calling AI' }]); } finally { setIsChatting(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Percent className="w-5 h-5 text-pink-500" /> จัดพอร์ตสินค้า & วางแผนโปรฯ</h3>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-5"><input className="w-full p-2 text-sm border rounded-lg" placeholder="สินค้า" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}/></div>
                <div className="col-span-3"><input type="number" className="w-full p-2 text-sm border rounded-lg" placeholder="ทุน" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)}/></div>
                <div className="col-span-3"><input type="number" className="w-full p-2 text-sm border rounded-lg" placeholder="ขาย" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}/></div>
                <div className="col-span-1"><button onClick={addItem} className="bg-blue-600 text-white p-2 rounded-lg w-full"><Plus size={16} /></button></div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">{promoItems.map((item) => (<div key={item.id} className="flex justify-between p-2 bg-white rounded border text-sm"><span>{item.name}</span><button onClick={() => setPromoItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-500"><Trash2 size={14}/></button></div>))}</div>
        </div>
        <div className="bg-pink-50 p-4 rounded-lg border border-pink-100">
           <div className="grid grid-cols-2 gap-4 mb-3"><InputGroup label="กำไรรวมที่ต้องการ" prefix="฿" value={targetTotalProfit} onChange={setTargetTotalProfit} /><InputGroup label="ระยะเวลา (วัน)" suffix="วัน" value={duration} onChange={setDuration} /></div>
        </div>
        <Button onClick={generatePlanWithAI} disabled={isPlanning || promoItems.length === 0} className="w-full bg-pink-600 text-white">{isPlanning ? 'Thinking...' : 'ให้ AI ช่วยจัดโปรฯ'}</Button>
        {!apiKey && <p className="text-xs text-red-500 mt-1 text-center">*ต้องใส่ API Key ก่อน</p>}
      </div>
      <div className="bg-slate-900 text-white rounded-xl flex flex-col relative overflow-hidden min-h-[500px]">
        <div className="flex border-b border-slate-700 bg-slate-900/50">
            <button onClick={() => setActiveRightTab('plan')} className={`flex-1 py-3 text-sm ${activeRightTab === 'plan' ? 'text-pink-400' : 'text-slate-400'}`}>ผลการคำนวณ</button>
            <button onClick={() => setActiveRightTab('chat')} className={`flex-1 py-3 text-sm ${activeRightTab === 'chat' ? 'text-pink-400' : 'text-slate-400'}`}>ปรึกษา AI</button>
        </div>
        {activeRightTab === 'plan' && aiPlan && (
            <div className="p-6 overflow-y-auto h-full">
                <div className="text-center mb-4"><h2 className="text-3xl font-bold">ยอดขายรวม: ฿{aiPlan.summary.totalRevenue.toLocaleString()}</h2><p className="text-slate-400 text-sm">{aiPlan.summary.strategyNote}</p></div>
                <table className="w-full text-sm text-left text-slate-300"><tbody>{aiPlan.items.map((item, i) => (<tr key={i} className="border-b border-slate-800"><td className="py-2">{item.name}</td><td className="text-red-400">-{item.discountPercent}%</td><td className="text-right">{item.targetUnits} ชิ้น</td></tr>))}</tbody></table>
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
const SmartReply = ({ apiKey }) => {
    const [msg, setMsg] = useState('');
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(false);
    const gen = async () => {
        if(!apiKey) return;
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
                {!apiKey && <p className="text-xs text-red-500 mt-1">*ต้องใส่ API Key ก่อน</p>}
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border h-full overflow-y-auto space-y-3">
                {replies.map((r,i)=><div key={i} className="bg-white p-3 rounded shadow-sm text-sm relative group"><p>{r}</p><button onClick={()=>navigator.clipboard.writeText(r)} className="absolute top-2 right-2 text-slate-300 hover:text-teal-600"><Copy size={14}/></button></div>)}
            </div>
        </div>
    )
}

// --- Feature 6: Image Generator (Pro) ---

const ImageGenerator = ({ apiKey }) => {
  const [productName, setProductName] = useState('');
  const [imageResult, setImageResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [preserveProduct, setPreserveProduct] = useState(true);
  const [promptStyle, setPromptStyle] = useState('Minimalist');

  const generateImage = async () => {
    if (!productName || !apiKey) return;
    setIsGenerating(true);
    const fullPrompt = `${promptStyle} photography of ${productName}, 4k, photorealistic.`;
    let res = null;
    if (uploadedImages.length > 0) {
        let p = fullPrompt;
        if(preserveProduct) p = `(Strictly preserve main product). ${fullPrompt}`;
        res = await callGeminiImageToImage(p, uploadedImages, apiKey);
    } else {
        res = await callGeminiImage(fullPrompt, apiKey);
    }
    setImageResult(res);
    setIsGenerating(false);
  };

  const handleUpload = (e) => {
      const files = Array.from(e.target.files);
      Promise.all(files.map(f => new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); }))).then(imgs => setUploadedImages(prev => [...prev, ...imgs]));
  }

  return (
      <div className="grid md:grid-cols-2 gap-6 h-full">
          <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><ImageIcon className="w-5 h-5 text-indigo-600"/> สร้างรูปสินค้า</h3>
              <InputGroup label="รายละเอียดสินค้า" value={productName} onChange={setProductName} />
              <div className="flex gap-2 mb-2 overflow-x-auto">{['Minimalist', 'Studio', 'Luxury', 'Nature'].map(s => <button key={s} onClick={()=>setPromptStyle(s)} className={`px-3 py-1 text-xs border rounded ${promptStyle===s ? 'bg-indigo-600 text-white' : 'bg-white'}`}>{s}</button>)}</div>
              <div>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer"><Upload className="w-5 h-5 text-slate-400"/><span className="text-xs text-slate-500">อัปโหลดภาพสินค้า</span><input type="file" hidden multiple onChange={handleUpload}/></label>
                  {uploadedImages.length > 0 && (
                      <div className="mt-2">
                          <div className="flex gap-2 overflow-x-auto pb-2">{uploadedImages.map((img, i) => <img key={i} src={img} className="w-12 h-12 rounded object-cover border"/>)}</div>
                          <button onClick={()=>setUploadedImages([])} className="text-xs text-red-500">ลบทั้งหมด</button>
                          <div onClick={()=>setPreserveProduct(!preserveProduct)} className={`mt-2 p-2 border rounded flex items-center gap-2 text-xs cursor-pointer ${preserveProduct ? 'bg-green-50 border-green-200' : ''}`}><Lock size={12}/> ล็อคสินค้าเดิม 100%</div>
                      </div>
                  )}
              </div>
              <Button onClick={generateImage} disabled={isGenerating || !productName} className="w-full bg-indigo-600 text-white">{isGenerating ? 'กำลังสร้าง...' : 'สร้างรูปภาพ'}</Button>
              {!apiKey && <p className="text-xs text-red-500 mt-1">*ต้องใส่ API Key ก่อน</p>}
          </div>
          <div className="bg-slate-50 rounded-xl border flex items-center justify-center min-h-[300px]">
              {imageResult ? <img src={imageResult} className="max-w-full max-h-full rounded-lg shadow" /> : <p className="text-slate-400 text-sm">ภาพผลลัพธ์</p>}
          </div>
      </div>
  )
}

// --- Feature 7: Video Script ---

const VideoScriptGenerator = ({ apiKey }) => {
    const [product, setProduct] = useState('');
    const [script, setScript] = useState('');
    const [loading, setLoading] = useState(false);
    const gen = async () => {
        if(!apiKey) return;
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
                {!apiKey && <p className="text-xs text-red-500 mt-1">*ต้องใส่ API Key ก่อน</p>}
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
            {activeTab === 'promo' && <PromoPlanner apiKey={apiKey} />}
            {activeTab === 'content' && <ContentGenerator apiKey={apiKey} />}
            {activeTab === 'ads' && <AdOptimizer apiKey={apiKey} />}
            {activeTab === 'reply' && <SmartReply apiKey={apiKey} />}
            {activeTab === 'image' && <ImageGenerator apiKey={apiKey} />}
            {activeTab === 'video' && <VideoScriptGenerator apiKey={apiKey} />}
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
