'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

// ─── i18n translations ────────────────────────────────────────────────────────
const T = {
  en: {
    logoSub: 'Government Services',
    tabs: ['AI Assistant','Explore Schemes','My Applications','Documents','Profile'],
    welcome: `Namaste! 🙏 I'm your NagrikAI assistant powered by IBM Granite AI.\n\nI can help you:\n• Find government schemes & scholarships\n• Check your preliminary eligibility\n• Prepare application documents\n• Guide you through official portals\n• 📷 Analyse images of government documents\n\nTry: "How do I apply for a driving licence?" or upload a document image!`,
    quickQuestions: ['How to apply for driving licence','PM Kisan scheme eligibility','Scholarships for engineering students','Ayushman Bharat benefits'],
    imgHint: 'Add a question about this image (optional)...',
    placeholder: 'Ask about government schemes, driving licence, passport, Aadhaar...',
    sendBtn: 'Send', analyseBtn: 'Analyse', loadingBtn: '...',
    disclaimer: '📷 Upload images of government documents for instant AI analysis  |  ⚠️ Preliminary guidance only — always verify at myscheme.gov.in',
    schemesTitle: 'Explore Government Schemes',
    schemesSub: 'Browse by category or ask the AI assistant for personalized recommendations',
    cantFind: "Can't find what you need?",
    askAI: 'Ask the AI Assistant',
    appsTitle: 'My Applications',
    appsSub: 'Track your government scheme applications',
    noApps: 'No applications yet. Discover schemes and save them here.',
    findSchemes: 'Find Schemes →',
    docsTitle: 'My Documents',
    docsSub: 'Upload and manage documents for government applications',
    docTypes: ['Aadhaar Card','PAN Card','Income Certificate','Caste Certificate','Bank Passbook','Domicile Certificate','Marksheet','Passport Photo'],
    uploadBtn: 'Upload',
    uploading: 'Uploading...',
    docSecurity: '🔒 Documents are encrypted and stored securely',
    docSecuritySub: 'Only you and authorized agents can access your documents',
    profileTitle: 'Profile & Preferences',
    profileSub: 'Your information helps find the most relevant schemes',
    editBtn: '✏️ Edit Profile', saveBtn: '✓ Save Changes',
    fields: [
      { k:'state', l:'State', ph:'e.g. Karnataka' },
      { k:'district', l:'District', ph:'e.g. Bangalore Urban' },
      { k:'age', l:'Age', ph:'e.g. 25', t:'number' },
      { k:'annual_income', l:'Annual Income (₹)', ph:'e.g. 200000', t:'number' },
      { k:'occupation', l:'Occupation', ph:'e.g. Student' },
      { k:'education', l:'Education Qualification', ph:'e.g. B.Tech' },
    ],
    catLabel: 'Category', langLabel: 'Preferred Language',
    checkboxes: [{k:'is_student',l:'Student'},{k:'is_farmer',l:'Farmer'},{k:'has_disability',l:'Person with Disability'},{k:'is_bpl',l:'Below Poverty Line (BPL)'}],
    privacyNote: '🔒 Your data is used only to find relevant government schemes. You can update or delete it at any time.',
    agentWorking: 'AI agents working...',
    schemesFound: (n:number) => `📋 ${n} Scheme${n>1?'s':''} Found`,
    adminBtn: '⚙ Admin', signOut: 'Sign out',
    userStatus: 'User-entered status — not an official update',
    askAIArrow: 'Ask AI →',
    imgUploadTitle: 'Upload image of a government document for AI analysis',
    imgSubHint: 'Add a question below or send for general analysis',
  },
  hi: {
    logoSub: 'सरकारी सेवाएं',
    tabs: ['AI सहायक','योजनाएं खोजें','मेरे आवेदन','दस्तावेज़','प्रोफ़ाइल'],
    welcome: `नमस्ते! 🙏 मैं आपका NagrikAI सहायक हूँ, IBM Granite AI द्वारा संचालित।\n\nमैं आपकी इन कामों में मदद कर सकता हूँ:\n• सरकारी योजनाएं और छात्रवृत्ति खोजें\n• पात्रता की प्रारंभिक जांच करें\n• आवेदन दस्तावेज़ तैयार करें\n• सरकारी पोर्टल पर मार्गदर्शन\n• 📷 सरकारी दस्तावेज़ की तस्वीर का विश्लेषण\n\nपूछें: "ड्राइविंग लाइसेंस के लिए कैसे आवेदन करें?"`,
    quickQuestions: ['ड्राइविंग लाइसेंस आवेदन','PM किसान योजना पात्रता','छात्रवृत्ति योजनाएं','आयुष्मान भारत लाभ'],
    imgHint: 'इस तस्वीर के बारे में प्रश्न लिखें (वैकल्पिक)...',
    placeholder: 'सरकारी योजना, ड्राइविंग लाइसेंस, पासपोर्ट के बारे में पूछें...',
    sendBtn: 'भेजें', analyseBtn: 'विश्लेषण', loadingBtn: '...',
    disclaimer: '📷 सरकारी दस्तावेज़ की तस्वीर अपलोड करें  |  ⚠️ केवल प्रारंभिक मार्गदर्शन — myscheme.gov.in पर सत्यापित करें',
    schemesTitle: 'सरकारी योजनाएं खोजें',
    schemesSub: 'श्रेणी के अनुसार खोजें या व्यक्तिगत सुझाव के लिए AI सहायक से पूछें',
    cantFind: 'जो चाहिए वो नहीं मिला?',
    askAI: 'AI सहायक से पूछें',
    appsTitle: 'मेरे आवेदन',
    appsSub: 'अपने सरकारी योजना आवेदनों की स्थिति देखें',
    noApps: 'अभी कोई आवेदन नहीं। योजनाएं खोजें और यहाँ सहेजें।',
    findSchemes: 'योजनाएं खोजें →',
    docsTitle: 'मेरे दस्तावेज़',
    docsSub: 'सरकारी आवेदनों के लिए दस्तावेज़ अपलोड और प्रबंधित करें',
    docTypes: ['आधार कार्ड','पैन कार्ड','आय प्रमाण पत्र','जाति प्रमाण पत्र','बैंक पासबुक','अधिवास प्रमाण पत्र','मार्कशीट','पासपोर्ट फोटो'],
    uploadBtn: 'अपलोड',
    uploading: 'अपलोड हो रहा है...',
    docSecurity: '🔒 दस्तावेज़ एन्क्रिप्टेड और सुरक्षित रूप से संग्रहीत हैं',
    docSecuritySub: 'केवल आप और अधिकृत एजेंट आपके दस्तावेज़ देख सकते हैं',
    profileTitle: 'प्रोफ़ाइल और प्राथमिकताएं',
    profileSub: 'आपकी जानकारी सबसे प्रासंगिक योजनाएं खोजने में मदद करती है',
    editBtn: '✏️ प्रोफ़ाइल संपादित करें', saveBtn: '✓ बदलाव सहेजें',
    fields: [
      { k:'state', l:'राज्य', ph:'जैसे: कर्नाटक' },
      { k:'district', l:'जिला', ph:'जैसे: बेंगलुरु' },
      { k:'age', l:'आयु', ph:'जैसे: 25', t:'number' },
      { k:'annual_income', l:'वार्षिक आय (₹)', ph:'जैसे: 200000', t:'number' },
      { k:'occupation', l:'व्यवसाय', ph:'जैसे: छात्र' },
      { k:'education', l:'शिक्षा योग्यता', ph:'जैसे: B.Tech' },
    ],
    catLabel: 'श्रेणी', langLabel: 'पसंदीदा भाषा',
    checkboxes: [{k:'is_student',l:'छात्र'},{k:'is_farmer',l:'किसान'},{k:'has_disability',l:'दिव्यांग'},{k:'is_bpl',l:'गरीबी रेखा से नीचे (BPL)'}],
    privacyNote: '🔒 आपका डेटा केवल प्रासंगिक सरकारी योजनाएं खोजने के लिए उपयोग किया जाता है।',
    agentWorking: 'AI एजेंट काम कर रहे हैं...',
    schemesFound: (n:number) => `📋 ${n} योजना${n>1?'एं':''} मिलीं`,
    adminBtn: '⚙ व्यवस्थापक', signOut: 'साइन आउट',
    userStatus: 'उपयोगकर्ता द्वारा दर्ज स्थिति — आधिकारिक अपडेट नहीं',
    askAIArrow: 'AI से पूछें →',
    imgUploadTitle: 'सरकारी दस्तावेज़ की तस्वीर AI विश्लेषण के लिए अपलोड करें',
    imgSubHint: 'नीचे प्रश्न लिखें या सामान्य विश्लेषण के लिए भेजें',
  },
  kn: {
    logoSub: 'ಸರ್ಕಾರಿ ಸೇವೆಗಳು',
    tabs: ['AI ಸಹಾಯಕ','ಯೋಜನೆಗಳು','ನನ್ನ ಅರ್ಜಿಗಳು','ದಾಖಲೆಗಳು','ಪ್ರೊಫೈಲ್'],
    welcome: `ನಮಸ್ಕಾರ! 🙏 ನಾನು ನಿಮ್ಮ NagrikAI ಸಹಾಯಕ, IBM Granite AI ಯಿಂದ ಚಾಲಿತ.\n\nನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n• ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ವಿದ್ಯಾರ್ಥಿವೇತನ ಹುಡುಕಿ\n• ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ\n• ಅರ್ಜಿ ದಾಖಲೆಗಳು ತಯಾರಿ\n• ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳಲ್ಲಿ ಮಾರ್ಗದರ್ಶನ\n• 📷 ಸರ್ಕಾರಿ ದಾಖಲೆಗಳ ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ\n\nಕೇಳಿ: "ಚಾಲನಾ ಪರವಾನಗಿಗೆ ಹೇಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಬೇಕು?"`,
    quickQuestions: ['ಚಾಲನಾ ಪರವಾನಗಿ ಅರ್ಜಿ','PM ಕಿಸಾನ್ ಯೋಜನೆ ಅರ್ಹತೆ','ವಿದ್ಯಾರ್ಥಿವೇತನ ಯೋಜನೆಗಳು','ಆಯುಷ್ಮಾನ್ ಭಾರತ ಪ್ರಯೋಜನಗಳು'],
    imgHint: 'ಈ ಚಿತ್ರದ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ (ಐಚ್ಛಿಕ)...',
    placeholder: 'ಸರ್ಕಾರಿ ಯೋಜನೆ, ಚಾಲನಾ ಪರವಾನಗಿ, ಪಾಸ್‌ಪೋರ್ಟ್ ಬಗ್ಗೆ ಕೇಳಿ...',
    sendBtn: 'ಕಳುಹಿಸಿ', analyseBtn: 'ವಿಶ್ಲೇಷಿಸಿ', loadingBtn: '...',
    disclaimer: '📷 ಸರ್ಕಾರಿ ದಾಖಲೆಗಳ ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ  |  ⚠️ ಪ್ರಾಥಮಿಕ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ — myscheme.gov.in ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ',
    schemesTitle: 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಅನ್ವೇಷಿಸಿ',
    schemesSub: 'ವರ್ಗದ ಮೂಲಕ ಬ್ರೌಸ್ ಮಾಡಿ ಅಥವಾ ವೈಯಕ್ತಿಕ ಸಲಹೆಗಾಗಿ AI ಸಹಾಯಕನನ್ನು ಕೇಳಿ',
    cantFind: 'ಬೇಕಾದದ್ದು ಕಾಣಿಸಲಿಲ್ಲವೇ?',
    askAI: 'AI ಸಹಾಯಕನನ್ನು ಕೇಳಿ',
    appsTitle: 'ನನ್ನ ಅರ್ಜಿಗಳು',
    appsSub: 'ನಿಮ್ಮ ಸರ್ಕಾರಿ ಯೋಜನೆ ಅರ್ಜಿಗಳ ಸ್ಥಿತಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ',
    noApps: 'ಇನ್ನೂ ಅರ್ಜಿಗಳಿಲ್ಲ. ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ ಇಲ್ಲಿ ಉಳಿಸಿ.',
    findSchemes: 'ಯೋಜನೆಗಳು ಹುಡುಕಿ →',
    docsTitle: 'ನನ್ನ ದಾಖಲೆಗಳು',
    docsSub: 'ಸರ್ಕಾರಿ ಅರ್ಜಿಗಳಿಗೆ ದಾಖಲೆಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ',
    docTypes: ['ಆಧಾರ್ ಕಾರ್ಡ್','ಪ್ಯಾನ್ ಕಾರ್ಡ್','ಆದಾಯ ಪ್ರಮಾಣಪತ್ರ','ಜಾತಿ ಪ್ರಮಾಣಪತ್ರ','ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್','ನಿವಾಸ ಪ್ರಮಾಣಪತ್ರ','ಅಂಕಪಟ್ಟಿ','ಪಾಸ್‌ಪೋರ್ಟ್ ಫೋಟೊ'],
    uploadBtn: 'ಅಪ್‌ಲೋಡ್',
    uploading: 'ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    docSecurity: '🔒 ದಾಖಲೆಗಳು ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಲ್ಪಟ್ಟಿವೆ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ',
    docSecuritySub: 'ನೀವು ಮತ್ತು ಅಧಿಕೃತ ಏಜೆಂಟ್‌ಗಳು ಮಾತ್ರ ನಿಮ್ಮ ದಾಖಲೆಗಳನ್ನು ನೋಡಬಹುದು',
    profileTitle: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಆದ್ಯತೆಗಳು',
    profileSub: 'ನಿಮ್ಮ ಮಾಹಿತಿ ಸಂಬಂಧಿತ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ',
    editBtn: '✏️ ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ', saveBtn: '✓ ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ',
    fields: [
      { k:'state', l:'ರಾಜ್ಯ', ph:'ಉದಾ: ಕರ್ನಾಟಕ' },
      { k:'district', l:'ಜಿಲ್ಲೆ', ph:'ಉದಾ: ಬೆಂಗಳೂರು' },
      { k:'age', l:'ವಯಸ್ಸು', ph:'ಉದಾ: 25', t:'number' },
      { k:'annual_income', l:'ವಾರ್ಷಿಕ ಆದಾಯ (₹)', ph:'ಉದಾ: 200000', t:'number' },
      { k:'occupation', l:'ವೃತ್ತಿ', ph:'ಉದಾ: ವಿದ್ಯಾರ್ಥಿ' },
      { k:'education', l:'ಶಿಕ್ಷಣ ಅರ್ಹತೆ', ph:'ಉದಾ: B.Tech' },
    ],
    catLabel: 'ವರ್ಗ', langLabel: 'ಆದ್ಯತೆಯ ಭಾಷೆ',
    checkboxes: [{k:'is_student',l:'ವಿದ್ಯಾರ್ಥಿ'},{k:'is_farmer',l:'ರೈತ'},{k:'has_disability',l:'ವಿಕಲಾಂಗ'},{k:'is_bpl',l:'ಬಡತನ ರೇಖೆಗಿಂತ ಕೆಳಗೆ (BPL)'}],
    privacyNote: '🔒 ನಿಮ್ಮ ಡೇಟಾ ಸಂಬಂಧಿತ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಲು ಮಾತ್ರ ಬಳಸಲಾಗುತ್ತದೆ.',
    agentWorking: 'AI ಏಜೆಂಟ್‌ಗಳು ಕೆಲಸ ಮಾಡುತ್ತಿವೆ...',
    schemesFound: (n:number) => `📋 ${n} ಯೋಜನೆ${n>1?'ಗಳು':''} ಕಂಡುಬಂದಿವೆ`,
    adminBtn: '⚙ ನಿರ್ವಾಹಕ', signOut: 'ಸೈನ್ ಔಟ್',
    userStatus: 'ಬಳಕೆದಾರ ನಮೂದಿಸಿದ ಸ್ಥಿತಿ — ಅಧಿಕೃತ ನವೀಕರಣ ಅಲ್ಲ',
    askAIArrow: 'AI ಕೇಳಿ →',
    imgUploadTitle: 'ಸರ್ಕಾರಿ ದಾಖಲೆಯ ಚಿತ್ರ AI ವಿಶ್ಲೇಷಣೆಗಾಗಿ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    imgSubHint: 'ಕೆಳಗೆ ಪ್ರಶ್ನೆ ಬರೆಯಿರಿ ಅಥವಾ ಸಾಮಾನ್ಯ ವಿಶ್ಲೇಷಣೆಗಾಗಿ ಕಳುಹಿಸಿ',
  },
} as const;
type Lang = keyof typeof T;

// ─── style constants ─────────────────────────────────────────────────────────
const c = {
  page:     { display:'flex', flexDirection:'column' as const, minHeight:'100vh', background:'#f8fafc', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  topnav:   { height:'60px', background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', padding:'0 20px', gap:'12px', position:'sticky' as const, top:0, zIndex:50, boxShadow:'0 1px 3px rgba(0,0,0,.06)' },
  logo:     { display:'flex', alignItems:'center', gap:'10px' },
  logoIcon: { fontSize:'22px' },
  logoName: { fontWeight:'800', fontSize:'16px', color:'#0f172a' },
  logoSub:  { fontSize:'10px', color:'#94a3b8' },
  navRight: { marginLeft:'auto', display:'flex', alignItems:'center', gap:'12px' },
  userBadge:{ fontSize:'13px', color:'#475569', fontWeight:'500' },
  langSelect:{ fontSize:'13px', border:'1px solid #e2e8f0', borderRadius:'6px', padding:'5px 10px', background:'#f8fafc', color:'#374151', cursor:'pointer' },
  logoutBtn: { fontSize:'13px', color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontWeight:'600' },
  tabnav:   { background:'#fff', borderBottom:'1px solid #e2e8f0', display:'flex', padding:'0 16px', overflowX:'auto' as const },
  tab:      { display:'flex', alignItems:'center', gap:'6px', padding:'14px 16px', fontSize:'13px', fontWeight:'500', color:'#64748b', cursor:'pointer', borderBottom:'2px solid transparent', whiteSpace:'nowrap' as const, background:'none', border:'none', borderBottomStyle:'solid' as const, borderBottomWidth:'2px', borderBottomColor:'transparent', transition:'all .15s' },
  tabActive:{ borderBottomColor:'#2563eb', color:'#2563eb', fontWeight:'700' },
  content:  { flex:1, overflow:'hidden' as const },
  chatWrap: { display:'flex', flexDirection:'column' as const, height:'calc(100vh - 118px)' },
  msgs:     { flex:1, overflowY:'auto' as const, padding:'20px', display:'flex', flexDirection:'column' as const, gap:'16px' },
  msgRow:   (role:'user'|'ai') => ({ display:'flex', justifyContent: role==='user' ? 'flex-end' : 'flex-start' }),
  bubble:   (role:'user'|'ai') => ({
    maxWidth:'600px', padding:'12px 16px', fontSize:'14px', lineHeight:'1.65',
    borderRadius: role==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
    background: role==='user' ? '#2563eb' : '#fff',
    color: role==='user' ? '#fff' : '#1e293b',
    border: role==='ai' ? '1px solid #e2e8f0' : 'none',
    boxShadow: role==='ai' ? '0 1px 3px rgba(0,0,0,.06)' : 'none',
  }),
  ts:       { fontSize:'11px', marginTop:'4px', opacity:0.5 },
  schemeCard:{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'12px', marginTop:'10px' },
  schemeName:{ fontWeight:'700', fontSize:'13.5px', color:'#0f172a' },
  schemeDept:{ fontSize:'12px', color:'#64748b', marginTop:'1px' },
  schemeBenefits:{ fontSize:'13px', color:'#334155', marginTop:'6px', lineHeight:'1.5' },
  verBadge: (v:string) => ({ display:'inline-flex', alignItems:'center', gap:'3px', padding:'2px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', background: v==='verified' ? '#dcfce7' : '#fef9c3', color: v==='verified' ? '#15803d' : '#a16207' }),
  eligBadge:(s:string) => ({ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', background: s.includes('eligible') && !s.includes('not') ? '#dcfce7' : s.includes('not') ? '#fee2e2' : '#dbeafe', color: s.includes('eligible') && !s.includes('not') ? '#15803d' : s.includes('not') ? '#dc2626' : '#1d4ed8' }),
  schemeActions:{ display:'flex', gap:'10px', marginTop:'8px' },
  schemeLink:{ fontSize:'12px', color:'#2563eb', fontWeight:'600', textDecoration:'none' },
  savebtn:  { fontSize:'12px', color:'#16a34a', fontWeight:'600', background:'none', border:'none', cursor:'pointer', padding:0 },
  typing:   { display:'flex', alignItems:'center', gap:'6px', padding:'12px 16px', background:'#fff', border:'1px solid #e2e8f0', borderRadius:'18px 18px 18px 4px', width:'fit-content' },
  dot:      { width:'8px', height:'8px', borderRadius:'50%', background:'#94a3b8', display:'inline-block' },
  inputWrap:{ background:'#fff', borderTop:'1px solid #e2e8f0', padding:'14px 20px' },
  quickBtns:{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap' as const },
  quickBtn: { padding:'5px 12px', background:'#eff6ff', color:'#2563eb', border:'none', borderRadius:'999px', fontSize:'12px', fontWeight:'500', cursor:'pointer' },
  inputRow: { display:'flex', gap:'10px' },
  textarea: { flex:1, padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:'10px', fontSize:'14px', resize:'none' as const, outline:'none', fontFamily:'inherit', color:'#0f172a', background:'#fff' },
  sendBtn:  (d:boolean) => ({ padding:'10px 22px', background: d ? '#94a3b8' : '#2563eb', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', fontSize:'14px', cursor: d ? 'not-allowed' : 'pointer' }),
  disclaimer:{ fontSize:'11px', color:'#94a3b8', textAlign:'center' as const, marginTop:'8px' },
  pad:      { padding:'24px', maxWidth:'900px', margin:'0 auto', width:'100%' },
  pageTitle:{ fontSize:'22px', fontWeight:'800', color:'#0f172a', marginBottom:'6px' },
  pageSub:  { fontSize:'14px', color:'#64748b', marginBottom:'24px' },
  catGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'16px' },
  catCard:  { background:'#fff', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'20px' },
  catTitle: { fontWeight:'700', fontSize:'14px', color:'#0f172a', marginBottom:'12px' },
  catItem:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #f1f5f9', fontSize:'13.5px', color:'#475569' },
  askBtn:   { fontSize:'12px', color:'#2563eb', background:'none', border:'none', cursor:'pointer', fontWeight:'600' },
  appCard:  { background:'#fff', border:'1px solid #e2e8f0', borderRadius:'14px', padding:'18px', marginBottom:'12px' },
  appName:  { fontWeight:'700', fontSize:'14px', color:'#0f172a' },
  appDate:  { fontSize:'12px', color:'#94a3b8', marginTop:'2px' },
  statusBadge:(s:string) => ({ display:'inline-flex', padding:'3px 10px', borderRadius:'999px', fontSize:'12px', fontWeight:'600', background: s==='approved' ? '#dcfce7' : s==='rejected' ? '#fee2e2' : s==='submitted' ? '#dbeafe' : '#f1f5f9', color: s==='approved' ? '#15803d' : s==='rejected' ? '#dc2626' : s==='submitted' ? '#1d4ed8' : '#475569' }),
  emptyState:{ textAlign:'center' as const, padding:'60px 20px', background:'#fff', borderRadius:'16px', border:'1px solid #e2e8f0' },
  emptyIcon: { fontSize:'48px', marginBottom:'12px' },
  emptyText: { fontSize:'14px', color:'#64748b', marginBottom:'16px' },
  primaryBtn:{ padding:'10px 22px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'10px', fontWeight:'700', fontSize:'14px', cursor:'pointer' },
  docGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'12px' },
  docBox:   { border:'2px dashed #cbd5e1', borderRadius:'12px', padding:'20px 12px', textAlign:'center' as const, cursor:'pointer', transition:'border-color .15s' },
  docBoxIcon:{ fontSize:'28px', marginBottom:'8px' },
  docBoxName:{ fontSize:'12px', color:'#475569', fontWeight:'500' },
  docBoxBtn: { fontSize:'11px', color:'#2563eb', marginTop:'4px', fontWeight:'600' },
  profileCard:{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'16px', padding:'24px' },
  formGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', marginBottom:'16px' },
  formField:{ display:'flex', flexDirection:'column' as const, gap:'4px' },
  label:    { fontSize:'12px', fontWeight:'600', color:'#374151' },
  input:    (disabled:boolean) => ({ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13.5px', outline:'none', background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#94a3b8' : '#0f172a', fontFamily:'inherit' }),
  select:   (disabled:boolean) => ({ padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13.5px', background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#94a3b8' : '#0f172a' }),
  editBtn:  (editing:boolean) => ({ padding:'8px 18px', background: editing ? '#16a34a' : '#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'700', fontSize:'13px', cursor:'pointer' }),
  privacyNote:{ fontSize:'12px', color:'#94a3b8', textAlign:'center' as const, marginTop:'16px', padding:'10px', background:'#f8fafc', borderRadius:'8px' },
};

interface Message {
  id: string; role: 'user'|'assistant'; content: string;
  schemes?: Record<string,unknown>[]; eligibility?: Record<string,unknown>[];
  timestamp: string;   // pre-formatted HH:MM:SS to avoid SSR/client mismatch
  isImage?: boolean;
}

/** Render message text with URLs converted to clickable <a> tags */
function MessageContent({ text, isUser }: { text: string; isUser: boolean }) {
  const linkColor = isUser ? '#bfdbfe' : '#2563eb';
  // Split on URLs (http/https)
  const parts = text.split(/(https?:\/\/[^\s\)\]>,"']+)/g);
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          // Clean trailing punctuation that's not part of the URL
          const clean = part.replace(/[.,;:!?）\]]+$/, '');
          const trailing = part.slice(clean.length);
          return (
            <span key={i}>
              <a
                href={clean}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: linkColor,
                  textDecoration: 'underline',
                  wordBreak: 'break-all',
                  fontWeight: 600,
                }}
              >
                🔗 {clean}
              </a>
              {trailing}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}
type Tab = 'chat'|'schemes'|'applications'|'documents'|'profile';

export default function CitizenPage() {
  const router = useRouter();
  const { user, token, clearAuth } = useAuthStore();
  const [tab, setTab] = useState<Tab>('chat');
  const [msgs, setMsgs] = useState<Message[]>([{
    id:'0', role:'assistant', timestamp: '',   // empty — filled client-side via useEffect
    content:`Namaste! 🙏 I'm your NagrikAI assistant powered by IBM Granite AI.\n\nI can help you:\n• Find government schemes & scholarships\n• Check your preliminary eligibility\n• Prepare application documents\n• Guide you through official portals\n• 📷 Analyse images of government documents\n\nTry: "How do I apply for a driving licence?" or upload a document image!`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [apps, setApps] = useState<Record<string,unknown>[]>([]);
  const [profile, setProfile] = useState<Record<string,unknown>>({});
  const [editProfile, setEditProfile] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [imgPreview, setImgPreview] = useState<string|null>(null);
  const [imgFile, setImgFile] = useState<File|null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string|null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);
  // Derived translation object
  const t = T[lang];

  useEffect(() => { if (!user) router.push('/'); }, [user, router]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);
  useEffect(() => {
    if (!token) return;
    if (tab === 'applications') api.getApplications(token).then((r: unknown) => { const res = r as { applications: Record<string,unknown>[] }; setApps(res.applications || []); }).catch(()=>{});
    if (tab === 'profile') api.getProfile(token).then((r: unknown) => setProfile(r as Record<string,unknown>)).catch(()=>{});
  }, [tab, token]);

  const sendMsg = async () => {
    if ((!input.trim() && !imgFile) || loading) return;

    // ── Image upload flow ──
    if (imgFile) {
      const question = input.trim() || 'Analyse this image and provide relevant government service guidance.';
      const userMsg: Message = { id: Date.now()+'', role:'user', content: `📷 ${imgFile.name}: ${question}`, timestamp: new Date().toLocaleTimeString(), isImage: true };
      setMsgs(p => [...p, userMsg]);
      setInput(''); setImgFile(null); setImgPreview(null); setLoading(true);
      try {
        const form = new FormData();
        form.append('file', imgFile);
        form.append('question', question);
        form.append('language', lang);
        const headers: Record<string,string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/analyze-image`, { method:'POST', headers, body: form });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json() as { analysis: string };
        setMsgs(p => [...p, { id:(Date.now()+1)+'', role:'assistant', content: data.analysis, timestamp: new Date().toLocaleTimeString() }]);
      } catch(e) {
        setMsgs(p => [...p, { id:(Date.now()+1)+'', role:'assistant', content:`Sorry, image analysis failed. Please try again. (${e})`, timestamp: new Date().toLocaleTimeString() }]);
      } finally { setLoading(false); }
      return;
    }

    // ── Text chat flow ──
    const userMsg: Message = { id: Date.now()+'', role:'user', content: input, timestamp: new Date().toLocaleTimeString() };
    setMsgs(p => [...p, userMsg]);
    const q = input; setInput(''); setLoading(true);
    try {
      // Build history from existing messages (exclude the initial welcome and image messages)
      const history = msgs
        .filter(m => !m.isImage && m.id !== '0')
        .slice(-12)  // keep last 12 for context window
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
      // Include profile context: uploaded documents + profile fields from state
      const context: Record<string, unknown> = {};
      if (uploadedDocs.length > 0) context['uploaded_documents'] = uploadedDocs;
      // Also pass profile fields so backend can supplement DB profile with latest state
      if (profile && Object.keys(profile).length > 0) {
        Object.entries(profile).forEach(([k, v]) => { if (v) context[k] = v; });
      }
      const res = await api.chat({ message: q, language: lang, history, context }, token) as { response: string; schemes?: Record<string,unknown>[]; eligibility_results?: Record<string,unknown>[] };
      setMsgs(p => [...p, { id:(Date.now()+1)+'', role:'assistant', content: res.response, schemes: res.schemes||[], eligibility: res.eligibility_results||[], timestamp: new Date().toLocaleTimeString() }]);
    } catch { setMsgs(p => [...p, { id:(Date.now()+1)+'', role:'assistant', content:'Sorry, I encountered an error. Please try again.', timestamp: new Date().toLocaleTimeString() }]); }
    finally { setLoading(false); }
  };

  const handleDocUpload = async (docType: string, file: File) => {
    setUploadingDoc(docType);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('question', `Extract all relevant information from this ${docType} document.`);
      form.append('language', lang);
      const headers: Record<string,string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/analyze-image`, { method:'POST', headers, body: form });
      if (r.ok) {
        // Track the document name so it gets passed into subsequent chat queries
        setUploadedDocs(prev => prev.includes(docType) ? prev : [...prev, docType]);
        toast.success(`${docType} uploaded! It will now be used to improve scheme recommendations.`);
      } else {
        throw new Error(`HTTP ${r.status}`);
      }
    } catch {
      toast.error(`Failed to upload ${docType}. Please try again.`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('Image must be under 10 MB'); return; }
    setImgFile(f);
    const reader = new FileReader();
    reader.onload = ev => setImgPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const saveApp = async (name: string) => {
    if (!token) { toast.error('Please log in'); return; }
    await api.createApplication({ scheme_name: name }, token).then(()=>toast.success('Saved!')).catch(()=>toast.error('Failed'));
  };

  const tabs: { id:Tab; label:string; icon:string }[] = [
    { id:'chat',         label:t.tabs[0], icon:'💬' },
    { id:'schemes',      label:t.tabs[1], icon:'🔍' },
    { id:'applications', label:t.tabs[2], icon:'📋' },
    { id:'documents',    label:t.tabs[3], icon:'📄' },
    { id:'profile',      label:t.tabs[4], icon:'👤' },
  ];

  const categories = [
    { cat:'🎓 Education',   items:['PM Scholarship Scheme','NSP Scholarships','AICTE Pragati','Post-Matric Scholarship','Karnataka Rajyotsava'] },
    { cat:'🌾 Agriculture', items:['PM Kisan Samman Nidhi','PM Fasal Bima Yojana','Kisan Credit Card','eNAM Portal'] },
    { cat:'🏥 Health',      items:['Ayushman Bharat PMJAY','Jan Arogya Yojana','ESIS','National Health Mission'] },
    { cat:'💼 Employment',  items:['PM Rozgar Yojana','MGNREGA','Skill India','Startup India'] },
    { cat:'🏠 Housing',     items:['PM Awas Yojana Urban','PM Awas Yojana Rural','Rajiv Awas Yojana'] },
    { cat:'👩 Women',       items:['Beti Bachao Beti Padhao','Sukanya Samriddhi Yojana','Mahila E-Haat'] },
  ];

  return (
    <div style={c.page}>
      {/* ── Top Nav ── */}
      <header style={c.topnav}>
        <div style={{ ...c.logo, cursor:'pointer' }} onClick={() => router.push('/')}>
          <span style={c.logoIcon}>🏛️</span>
          <div><div style={c.logoName}>NagrikAI</div><div style={c.logoSub}>{t.logoSub}</div></div>
        </div>
        <div style={c.navRight}>
          <select value={lang} onChange={e=>setLang(e.target.value as Lang)} style={c.langSelect}>
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
            <option value="kn">ಕನ್ನಡ</option>
          </select>
          <span style={c.userBadge}>{user?.full_name || user?.email?.split('@')[0]}</span>
          {user?.role === 'admin' && (
            <button onClick={()=>router.push('/admin')} style={{ ...c.logoutBtn, color:'#7c3aed' }}>{t.adminBtn}</button>
          )}
          <button onClick={()=>{clearAuth();router.push('/');}} style={c.logoutBtn}>{t.signOut}</button>
        </div>
      </header>

      {/* ── Tab Nav ── */}
      <div style={c.tabnav}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ ...c.tab, ...(tab===t.id ? c.tabActive : {}) }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={c.content}>

        {/* Chat */}
        {tab === 'chat' && (
          <div style={c.chatWrap}>
            <div style={c.msgs}>
              {msgs.map(m => (
                <div key={m.id} style={c.msgRow(m.role === 'user' ? 'user' : 'ai')}>
                  <div style={c.bubble(m.role === 'user' ? 'user' : 'ai')}>
                    <MessageContent text={m.content} isUser={m.role === 'user'} />

                    {/* Schemes */}
                    {m.schemes && m.schemes.length > 0 && (
                      <div style={{ marginTop:'12px' }}>
                        <div style={{ fontWeight:'700', fontSize:'13px', color:'#475569', marginBottom:'8px' }}>
                          📋 {m.schemes.length} Scheme{m.schemes.length>1?'s':''} Found
                        </div>
                        {m.schemes.map((s,i) => {
                          const sc = s as { scheme_name:string; department:string; benefits:string; official_url?:string; verification_status:string };
                          return (
                            <div key={i} style={c.schemeCard}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                                <div>
                                  <div style={c.schemeName}>{sc.scheme_name}</div>
                                  <div style={c.schemeDept}>{sc.department}</div>
                                </div>
                                <span style={c.verBadge(sc.verification_status)}>
                                  {sc.verification_status === 'verified' ? '✓ Verified' : '⚠ Unverified'}
                                </span>
                              </div>
                              <div style={c.schemeBenefits}>{sc.benefits}</div>
                              <div style={c.schemeActions}>
                                {sc.official_url && <a href={sc.official_url} target="_blank" rel="noreferrer" style={c.schemeLink}>Official Portal →</a>}
                                <button onClick={()=>saveApp(sc.scheme_name)} style={c.savebtn}>+ Save Application</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Eligibility */}
                    {m.eligibility && m.eligibility.length > 0 && (
                      <div style={{ marginTop:'10px' }}>
                        <div style={{ fontWeight:'700', fontSize:'13px', color:'#475569', marginBottom:'6px' }}>✅ Eligibility Assessment</div>
                        {m.eligibility.map((e,i) => {
                          const el = e as { scheme_name:string; status:string; explanation:string };
                          return (
                            <div key={i} style={{ background:'#eff6ff', borderRadius:'8px', padding:'10px', marginTop:'6px' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <span style={{ fontSize:'13px', fontWeight:'600' }}>{el.scheme_name}</span>
                                <span style={c.eligBadge(el.status)}>{el.status?.replace(/_/g,' ')}</span>
                              </div>
                              <div style={{ fontSize:'12px', color:'#475569', marginTop:'4px', lineHeight:'1.5' }}>{el.explanation}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {m.timestamp && <div style={c.ts}>{m.timestamp}</div>}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={c.msgRow('ai')}>
                  <div style={c.typing}>
                    <div style={c.dot} className="dot-bounce" />
                    <div style={c.dot} className="dot-bounce" />
                    <div style={c.dot} className="dot-bounce" />
                    <span style={{ fontSize:'12px', color:'#94a3b8', marginLeft:'4px' }}>{t.agentWorking}</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div style={c.inputWrap}>
              <div style={c.quickBtns}>
                {t.quickQuestions.map(p => (
                  <button key={p} onClick={()=>setInput(p)} style={c.quickBtn}>{p}</button>
                ))}
              </div>

              {/* Image preview */}
              {imgPreview && (
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px', padding:'8px 12px', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'10px' }}>
                  <img src={imgPreview} alt="preview" style={{ width:'48px', height:'48px', objectFit:'cover', borderRadius:'6px', border:'1px solid #e2e8f0' }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'12px', fontWeight:'600', color:'#15803d' }}>📷 {imgFile?.name}</div>
                    <div style={{ fontSize:'11px', color:'#64748b' }}>{t.imgSubHint}</div>
                  </div>
                  <button onClick={()=>{setImgFile(null);setImgPreview(null);}} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:'18px', padding:'0 4px' }}>×</button>
                </div>
              )}

              <div style={c.inputRow}>
                {/* Hidden file input */}
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageSelect} />

                {/* Image upload button */}
                <button
                  onClick={()=>fileRef.current?.click()}
                  disabled={loading}
                  title={t.imgUploadTitle}
                  style={{ padding:'10px 14px', background:'#f8fafc', color:'#475569', border:'1.5px solid #e2e8f0', borderRadius:'10px', cursor: loading ? 'not-allowed' : 'pointer', fontSize:'18px', flexShrink:0 }}
                >📷</button>

                <textarea
                  value={input} rows={2}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                  placeholder={imgFile ? t.imgHint : t.placeholder}
                  style={c.textarea}
                />
                <button onClick={sendMsg} disabled={loading||(!input.trim()&&!imgFile)} style={c.sendBtn(loading||(!input.trim()&&!imgFile))}>
                  {loading ? t.loadingBtn : imgFile ? t.analyseBtn : t.sendBtn}
                </button>
              </div>
              <div style={c.disclaimer}>{t.disclaimer}</div>
            </div>
          </div>
        )}

        {/* Explore Schemes */}
        {tab === 'schemes' && (
          <div style={c.pad}>
            <div style={c.pageTitle}>{t.schemesTitle}</div>
            <div style={c.pageSub}>{t.schemesSub}</div>
            <div style={c.catGrid}>
              {categories.map(cat => (
                <div key={cat.cat} style={c.catCard}>
                  <div style={c.catTitle}>{cat.cat}</div>
                  {cat.items.map(item => (
                    <div key={item} style={c.catItem}>
                      <span>{item}</span>
                      <button onClick={()=>{setInput(`Tell me about ${item}`);setTab('chat');}} style={c.askBtn}>{t.askAIArrow}</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop:'24px', padding:'20px', background:'#eff6ff', borderRadius:'12px', textAlign:'center', border:'1px solid #bfdbfe' }}>
              <div style={{ fontWeight:'700', color:'#1d4ed8', marginBottom:'8px' }}>🔍 {t.cantFind}</div>
              <button onClick={()=>setTab('chat')} style={{ padding:'10px 24px', background:'#2563eb', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'700', cursor:'pointer' }}>
                {t.askAI}
              </button>
            </div>
          </div>
        )}

        {/* Applications */}
        {tab === 'applications' && (
          <div style={c.pad}>
            <div style={c.pageTitle}>{t.appsTitle}</div>
            <div style={c.pageSub}>{t.appsSub}</div>
            {apps.length === 0 ? (
              <div style={c.emptyState}>
                <div style={c.emptyIcon}>📋</div>
                <div style={c.emptyText}>{t.noApps}</div>
                <button onClick={()=>setTab('chat')} style={c.primaryBtn}>{t.findSchemes}</button>
              </div>
            ) : apps.map(a => {
              const app = a as { id:string; scheme_name:string; status:string; created_at:string; is_official_update?:boolean };
              return (
                <div key={app.id} style={c.appCard}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={c.appName}>{app.scheme_name}</div>
                      <div style={c.appDate}>Created {new Date(app.created_at).toLocaleDateString('en-IN')}</div>
                    </div>
                    <span style={c.statusBadge(app.status)}>{app.status}</span>
                  </div>
                  {!app.is_official_update && (
                    <div style={{ fontSize:'12px', color:'#d97706', marginTop:'6px' }}>⚠️ {t.userStatus}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Documents */}
        {tab === 'documents' && (
          <div style={c.pad}>
            <div style={c.pageTitle}>{t.docsTitle}</div>
            <div style={c.pageSub}>{t.docsSub}</div>
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:'16px', padding:'24px' }}>
              {/* Hidden file input for document upload */}
              <input ref={docFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,image/*" style={{ display:'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  const docName = docFileRef.current?.dataset.doctype || '';
                  if (f && docName) handleDocUpload(docName, f);
                  e.target.value = '';
                }}
              />
              <div style={c.docGrid}>
                {t.docTypes.map(doc => {
                  const isUp = uploadingDoc === doc;
                  return (
                    <div key={doc} style={{ ...c.docBox, borderColor: isUp ? '#2563eb' : '#cbd5e1', background: isUp ? '#eff6ff' : '#fff', cursor: isUp ? 'default' : 'pointer' }}
                      onClick={() => {
                        if (isUp) return;
                        if (docFileRef.current) { docFileRef.current.dataset.doctype = doc; docFileRef.current.click(); }
                      }}
                    >
                      <div style={c.docBoxIcon}>{isUp ? '⏳' : '📄'}</div>
                      <div style={c.docBoxName}>{doc}</div>
                      <div style={{ ...c.docBoxBtn, color: isUp ? '#64748b' : '#2563eb' }}>
                        {isUp ? t.uploading : `${t.uploadBtn} →`}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop:'20px', padding:'12px', background:'#f0fdf4', borderRadius:'8px', border:'1px solid #bbf7d0' }}>
                <div style={{ fontSize:'13px', color:'#15803d', fontWeight:'600' }}>{t.docSecurity}</div>
                <div style={{ fontSize:'12px', color:'#166534', marginTop:'2px' }}>{t.docSecuritySub}</div>
              </div>
            </div>
          </div>
        )}

        {/* Profile */}
        {tab === 'profile' && (
          <div style={c.pad}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <div>
                <div style={c.pageTitle}>{t.profileTitle}</div>
                <div style={c.pageSub}>{t.profileSub}</div>
              </div>
              <button onClick={()=>editProfile ? api.updateProfile(profile, token!).then(()=>{toast.success('Saved!');setEditProfile(false);}).catch(()=>toast.error('Failed')) : setEditProfile(true)} style={c.editBtn(editProfile)}>
                {editProfile ? t.saveBtn : t.editBtn}
              </button>
            </div>
            <div style={c.profileCard}>
              <div style={c.formGrid}>
                {t.fields.map(f => (
                  <div key={f.k} style={c.formField}>
                    <label style={c.label}>{f.l}</label>
                    <input type={(f as {k:string;l:string;ph:string;t?:string}).t||'text'} placeholder={f.ph} disabled={!editProfile}
                      value={String(profile[f.k]||'')}
                      onChange={e=>setProfile(p=>({...p,[f.k]:e.target.value}))}
                      style={c.input(!editProfile)} />
                  </div>
                ))}
              </div>
              <div style={c.formGrid}>
                <div style={c.formField}>
                  <label style={c.label}>{t.catLabel}</label>
                  <select disabled={!editProfile} value={String(profile.category||'')} onChange={e=>setProfile(p=>({...p,category:e.target.value}))} style={c.select(!editProfile)}>
                    <option value="">Select category</option>
                    {['General','SC','ST','OBC','EWS'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={c.formField}>
                  <label style={c.label}>{t.langLabel}</label>
                  <select disabled={!editProfile} value={String(profile.preferred_language||'en')} onChange={e=>setProfile(p=>({...p,preferred_language:e.target.value}))} style={c.select(!editProfile)}>
                    <option value="en">English</option>
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="kn">Kannada (ಕನ್ನಡ)</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:'24px', flexWrap:'wrap', marginTop:'8px' }}>
                {t.checkboxes.map(f=>(
                  <label key={f.k} style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'13.5px', color:'#374151', cursor:'pointer' }}>
                    <input type="checkbox" disabled={!editProfile} checked={Boolean(profile[f.k])} onChange={e=>setProfile(p=>({...p,[f.k]:e.target.checked}))} />
                    {f.l}
                  </label>
                ))}
              </div>
              <div style={c.privacyNote}>{t.privacyNote}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
