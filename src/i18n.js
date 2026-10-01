const LANG_KEY = "dastak:lang";

const STRINGS = {
  en: {
    welcomeTitle: "Welcome! We're delighted to have you here!",
    welcomeSub: "You are one step close to digital platform.",
    verifyTitle: "Verify Your License",
    trackTitle: "Track Your Application",
    licenseType: "License type",
    documentNumber: "Document number",
    documentPlaceholder: "Enter document number",
    cnic: "CNIC number",
    cnicPlaceholder: "13 digits without dashes (e.g. 3520212345678)",
    trackingId: "Application tracking ID",
    trackingPlaceholder: "Enter application tracking ID",
    verifyBtn: "Verify License",
    trackBtn: "Track Application",
    homeHint:
      "Use your <strong class=\"home-hint-em\">Tracking / Application ID</strong> and <strong class=\"home-hint-em\">CNIC</strong>. CNIC is checked on this device only and is not stored.",
    certTitle: "Vehicle Fitness Certificate",
    certStatus: "Certificate status",
    appTimeline: "Application progress",
    backHome: "Back to Home",
    downloadPdf: "Download PDF",
    printForm: "Print Form-I",
    scanVerify: "Scan to verify",
    langToggle: "اردو",
    expiryExpired: "This certificate has expired. Please renew with your district transport office.",
    expirySoon30: "Expires within 30 days — plan your renewal soon.",
    expirySoon60: "Expires within 60 days — consider renewing early.",
    captchaLabel: "Security check",
    captchaPrompt: "What is",
  },
  ur: {
    welcomeTitle: "خوش آمدید! ہمیں خوشی ہے کہ آپ یہاں ہیں!",
    welcomeSub: "آپ ڈیجیٹل پلیٹ فارم کے قریب ہیں۔",
    verifyTitle: "اپنا لائسنس تصدیق کریں",
    trackTitle: "درخواست ٹریک کریں",
    licenseType: "لائسنس کی قسم",
    documentNumber: "دستاویز نمبر",
    documentPlaceholder: "دستاویز نمبر درج کریں",
    cnic: "شناختی کارڈ نمبر",
    cnicPlaceholder: "13 ہندسے بغیر ڈیش (مثلاً 3520212345678)",
    trackingId: "درخواست ٹریکنگ آئی ڈی",
    trackingPlaceholder: "ٹریکنگ آئی ڈی درج کریں",
    verifyBtn: "لائسنس تصدیق",
    trackBtn: "درخواست ٹریک",
    homeHint:
      "اپنی <strong class=\"home-hint-em\">ٹریکنگ / درخواست آئی ڈی</strong> اور <strong class=\"home-hint-em\">شناختی کارڈ</strong> درج کریں۔ شناختی کارڈ صرف اس ڈivice پر چیک ہوتا ہے، محفوظ نہیں کیا جاتا۔",
    certTitle: "گاڑی فٹنس سرٹیفکیٹ",
    certStatus: "سرٹیفکیٹ کی حیثیت",
    appTimeline: "درخواست کی پیش رفت",
    backHome: "ہوم پر واپس",
    downloadPdf: "PDF ڈاؤنلوڈ",
    printForm: "Form-I پرنٹ",
    scanVerify: "تصدیق کے لیے اسکین کریں",
    langToggle: "English",
    expiryExpired: "یہ سرٹیفکیٹ ختم ہو چکا ہے۔ ضلع ٹرانسپورٹ آفس سے تجدید کریں۔",
    expirySoon30: "30 دنوں میں ختم — جلد تجدید کی منصوبہ بندی کریں۔",
    expirySoon60: "60 دنوں میں ختم — جلد تجدید پر غور کریں۔",
    captchaLabel: "سیکیورٹی چیک",
    captchaPrompt: "جواب کیا ہے",
  },
};

export function getLang() {
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "ur" ? "ur" : "en";
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang === "ur" ? "ur" : "en");
}

export function t(key) {
  const lang = getLang();
  return STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
}

export function applyDocumentLang() {
  document.documentElement.lang = getLang() === "ur" ? "ur" : "en";
}
