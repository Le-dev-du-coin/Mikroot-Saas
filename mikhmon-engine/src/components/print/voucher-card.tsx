"use client";

import QRCode from "react-qr-code";

export interface VoucherData {
  username: string;
  password?: string;
  profile: string;
  validity?: string;
  timeLimit?: string;
  dataLimit?: string;
  price?: string;
  server?: string;
  loginUrl?: string;
  hotspotName?: string;
  index?: number;
}

export interface PrintOptions {
  routerName?: string;
  showQr?: boolean;
}

interface VoucherCardProps {
  voucher: VoucherData;
  showQr?: boolean;
  className?: string;
}

export function VoucherCard({
  voucher,
  showQr = false,
  className = "",
}: VoucherCardProps) {
  const isCodeOnly = !voucher.password || voucher.password === voucher.username;
  const loginUrl =
    voucher.loginUrl ||
    `http://hotspot.local/login?username=${encodeURIComponent(voucher.username)}&password=${encodeURIComponent(voucher.password || "")}`;

  const displayName = voucher.hotspotName || "HOTSPOT WI-FI";
  const footerInfo = [
    voucher.validity || voucher.timeLimit,
    voucher.price ? `${voucher.price}` : "",
  ]
    .filter(Boolean)
    .join(" - ") || voucher.profile;

  return (
    <div
      className={`border-[1.5px] border-slate-900 rounded-md p-2 bg-white text-slate-950 flex flex-col justify-between select-none ${className}`}
      style={{ minHeight: "110px", width: "100%", maxWidth: "220px" }}
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between font-black text-[11px] uppercase tracking-tight">
          <span className="truncate pr-1">{displayName}</span>
          <span className="shrink-0">[{voucher.index || 1}]</span>
        </div>
        <div className="border-b-[1.5px] border-slate-900 my-1"></div>
      </div>

      {/* Body */}
      <div className="my-auto py-1">
        {showQr ? (
          <div className="flex items-center gap-2">
            <div className="shrink-0 p-0.5 bg-white border border-slate-300 rounded">
              <QRCode value={loginUrl} size={48} level="L" />
            </div>
            <div className="flex-1 min-w-0 text-center">
              {isCodeOnly ? (
                <>
                  <div className="text-[9px] font-bold uppercase text-slate-600">Code Ticket</div>
                  <div className="border border-slate-800 rounded px-1 py-0.5 text-xs font-black font-mono tracking-wider truncate bg-slate-50">
                    {voucher.username}
                  </div>
                </>
              ) : (
                <div className="text-[10px] space-y-0.5 text-left">
                  <div className="truncate"><span className="text-slate-500 font-bold">U:</span> <b className="font-mono">{voucher.username}</b></div>
                  <div className="truncate"><span className="text-slate-500 font-bold">P:</span> <b className="font-mono">{voucher.password}</b></div>
                </div>
              )}
            </div>
          </div>
        ) : isCodeOnly ? (
          <div className="text-center space-y-0.5">
            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-700">Code Ticket</div>
            <div className="border border-slate-800 rounded px-2 py-1 text-sm font-black font-mono tracking-wider bg-slate-50">
              {voucher.username}
            </div>
          </div>
        ) : (
          <div className="border border-slate-800 rounded p-1 text-[11px] space-y-0.5 bg-slate-50">
            <div className="flex justify-between">
              <span className="text-slate-600 font-bold">Utilisateur :</span>
              <span className="font-black font-mono">{voucher.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-bold">Mot de passe :</span>
              <span className="font-black font-mono">{voucher.password}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border border-slate-800 rounded px-1 py-0.5 text-center text-[10px] font-black uppercase tracking-tight bg-slate-50 mt-1 truncate">
        {footerInfo}
      </div>
    </div>
  );
}

function generateFileName(routerName?: string): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "-");
  const router = routerName?.replace(/[^a-zA-Z0-9]/g, "_") || "Tickets_Hotspot";
  return `${router}_${date}_${time}`;
}

/**
 * Print vouchers in the classic Mikhmon 4-column grid layout
 */
export function printVouchers(
  vouchers: VoucherData[],
  options: PrintOptions = {},
) {
  const { routerName, showQr = false } = options;
  const fileName = generateFileName(routerName);
  const displayName = (routerName || "HOTSPOT WI-FI").toUpperCase();

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Veuillez autoriser les fenêtres pop-up dans votre navigateur pour imprimer les tickets.");
    return;
  }

  const vouchersHtml = vouchers
    .map((voucher, idx) => {
      const isCodeOnly = !voucher.password || voucher.password === voucher.username;
      const indexNum = voucher.index !== undefined ? voucher.index : idx + 1;
      const footerInfo =
        [voucher.validity || voucher.timeLimit, voucher.price ? `${voucher.price}` : ""]
          .filter(Boolean)
          .join(" ") || voucher.profile;

      const loginUrl =
        voucher.loginUrl ||
        `http://hotspot.local/login?username=${encodeURIComponent(voucher.username)}&password=${encodeURIComponent(voucher.password || "")}`;

      return `
        <div class="voucher-card">
          <div class="card-header">
            <span class="hotspot-title">${displayName}</span>
            <span class="card-idx">[${indexNum}]</span>
          </div>
          <div class="divider"></div>
          <div class="card-body">
            ${
              showQr
                ? `
              <div class="qr-layout">
                <img class="qr-img" src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(loginUrl)}" alt="QR" />
                <div class="qr-info">
                  ${
                    isCodeOnly
                      ? `
                    <div class="sub-label">Code Ticket</div>
                    <div class="code-box-small">${voucher.username}</div>
                  `
                      : `
                    <div class="cred-row"><span>U:</span><b>${voucher.username}</b></div>
                    <div class="cred-row"><span>P:</span><b>${voucher.password}</b></div>
                  `
                  }
                </div>
              </div>
            `
                : isCodeOnly
                  ? `
              <div class="sub-label">Code Ticket</div>
              <div class="code-box">${voucher.username}</div>
            `
                  : `
              <div class="user-pass-box">
                <div class="cred-row"><span>Utilisateur :</span><b>${voucher.username}</b></div>
                <div class="cred-row"><span>Mot de passe :</span><b>${voucher.password}</b></div>
              </div>
            `
            }
          </div>
          <div class="footer-box">${footerInfo}</div>
        </div>
      `;
    })
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>${fileName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 6mm 5mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #ffffff;
          color: #000000;
        }
        .vouchers-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2.5mm;
          padding: 1mm;
          width: 100%;
        }
        .voucher-card {
          border: 1.5px solid #111111;
          border-radius: 3px;
          padding: 1.8mm;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          break-inside: avoid;
          page-break-inside: avoid;
          height: 27mm;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 900;
          font-size: 8.5pt;
          line-height: 1;
        }
        .hotspot-title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 34mm;
        }
        .card-idx {
          font-size: 8.5pt;
          font-weight: bold;
        }
        .divider {
          border-bottom: 1.5px solid #111111;
          margin: 1mm 0 1.2mm 0;
        }
        .card-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .sub-label {
          text-align: center;
          font-size: 6.5pt;
          font-weight: 600;
          color: #222222;
          margin-bottom: 0.5mm;
        }
        .code-box {
          border: 1px solid #222222;
          border-radius: 2px;
          padding: 1mm 0.5mm;
          font-size: 11pt;
          font-weight: 900;
          font-family: "Courier New", Courier, monospace;
          letter-spacing: 0.8px;
          text-align: center;
          background: #ffffff;
          line-height: 1;
        }
        .code-box-small {
          border: 1px solid #222222;
          border-radius: 2px;
          padding: 0.5mm;
          font-size: 8.5pt;
          font-weight: 900;
          font-family: monospace;
          text-align: center;
        }
        .user-pass-box {
          border: 1px solid #222222;
          border-radius: 2px;
          padding: 0.8mm;
          font-size: 7.5pt;
        }
        .cred-row {
          display: flex;
          justify-content: space-between;
          line-height: 1.2;
        }
        .footer-box {
          border: 1px solid #222222;
          border-radius: 2px;
          padding: 0.6mm 1mm;
          text-align: center;
          font-size: 7pt;
          font-weight: 800;
          margin-top: 1mm;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1;
        }
        .qr-layout {
          display: flex;
          align-items: center;
          gap: 1.5mm;
        }
        .qr-img {
          width: 11mm;
          height: 11mm;
        }
        .qr-info {
          flex: 1;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .vouchers-grid {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="vouchers-grid">
        ${vouchersHtml}
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
