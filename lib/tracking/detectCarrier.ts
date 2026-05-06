export type Track17Carrier = {
  code: string;
  name: string;
};

export function detectCarrier(trackingNumber: string): Track17Carrier | null {
  const value = trackingNumber.trim().toUpperCase();

  if (/^003[45]/.test(value)) return { code: "7041", name: "DHL Paket" };
  if (/^CY\d+DE$/.test(value)) return { code: "7044", name: "Deutsche Post" };
  if (/^(CB|CR)\d+DE$/.test(value)) return { code: "190133", name: "Correos" };
  if (/^1Z/.test(value)) return { code: "100002", name: "UPS" };
  if (/^\d{12}$/.test(value)) return { code: "100003", name: "FedEx" };
  if (/^\d{10}$/.test(value)) return { code: "100001", name: "DHL Express" };

  return null;
}

