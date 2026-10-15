const ONES = [
  "",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
  "ELEVEN",
  "TWELVE",
  "THIRTEEN",
  "FOURTEEN",
  "FIFTEEN",
  "SIXTEEN",
  "SEVENTEEN",
  "EIGHTEEN",
  "NINETEEN",
];

const TENS = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

function under100(n) {
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
}

function under1000(n) {
  if (n < 100) return under100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${ONES[hundreds]} HUNDRED`;
  return rest ? `${head} ${under100(rest)}` : head;
}

function integerToWords(n) {
  if (n === 0) return "ZERO";
  const parts = [];
  let rem = n;

  const crore = Math.floor(rem / 10000000);
  rem %= 10000000;
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;

  if (crore) parts.push(`${under1000(crore)} CRORE`);
  if (lakh) parts.push(`${under1000(lakh)} LAKH`);
  if (thousand) parts.push(`${under1000(thousand)} THOUSAND`);
  if (rem) parts.push(under1000(rem));

  return parts.join(" ");
}

/** e.g. 1500 → "ONE THOUSAND FIVE HUNDRED ONLY" */
export function amountToWords(amount) {
  const raw = String(amount ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/,/g, "").match(/^\d+(?:\.\d+)?/);
  if (!digits) return "";
  const n = Math.floor(Number(digits[0]));
  if (!Number.isFinite(n) || n < 0) return "";
  return `${integerToWords(n)} ONLY`;
}
