import QRCodeLib from "qrcode";

export async function QRCode({ id }: { id: string }) {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/verify/${id}`;
  const dataUrl = await QRCodeLib.toDataURL(url, { width: 120, margin: 1 });
  return <img src={dataUrl} alt="QR Code" width={80} height={80} />;
}
