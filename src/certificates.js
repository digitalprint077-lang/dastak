export const FOLLOW_TOKEN = "TvALy858l8Oc";

export const certificates = {
  [FOLLOW_TOKEN]: {
    status: "Issued",
    fields: [
      ["Certificate Number", "PES001VF00000236"],
      ["Tracking ID", "VF260921-0000885"],
      ["Applicant Name", "Fahad Jahanzaib Maqsood"],
      ["Father Name", "Maqsood Ahmad"],
      ["Registration Number", "Z 1931"],
      ["Chassis Number", "FD2JPB-10382"],
      ["Engine Number", "J08CB23642"],
      ["Vehicle Kind", "HTV"],
      ["Issue Date", "2026-09-21"],
      ["Expiry Date", "2027-03-21"],
      ["Service", "Renewal"],
      ["District", "Peshawar"],
      ["Application Status", "Certificate Ready - Available for Download"],
    ],
  },
};

export function followPath(token = FOLLOW_TOKEN) {
  return `/vehiclefitness/${token}`;
}

export function followLink(origin = window.location.origin, token = FOLLOW_TOKEN) {
  return `${origin}${followPath(token)}`;
}
