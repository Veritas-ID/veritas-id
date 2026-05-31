import { VeritasRecord } from "@/lib/supabase";
import ChartRenderer from "@/components/ChartRenderer";
import { QRCode } from "@/components/QRCode";

interface ChartCardProps {
  record: VeritasRecord;
  watermark?: string;
}

export default async function ChartCard({ record, watermark }: ChartCardProps) {
  const summary =
    (record.chart_config as { summary?: string }).summary ?? "";

  const title = `${record.indicator_label} — ${record.country_name}, ${record.year_start}–${record.year_end}`;

  const formattedDate = new Date(record.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="relative">
      <div className="bg-white max-w-[800px] mx-auto shadow-sm border border-gray-200 rounded-lg p-8">
        {/* Title */}
        <h2 className="text-xl font-semibold text-gray-900 mb-6">{title}</h2>

        {/* Chart */}
        <ChartRenderer years={record.years} values={record.values} />

        {/* Summary */}
        {summary && (
          <p className="mt-4 text-sm text-gray-600 italic">{summary}</p>
        )}

        {/* Divider */}
        <hr className="my-6 border-gray-200" />

        {/* Footer row */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: metadata */}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-400">Veritas ID:</span>
            <span className="font-mono text-sm text-gray-900">{record.id}</span>
            <span className="text-xs text-gray-400">
              Source: World Bank Data360
            </span>
            <span className="text-xs text-gray-400">{formattedDate}</span>
          </div>

          {/* Right: QR code */}
          <div className="flex-shrink-0">
            <QRCode id={record.id} />
          </div>
        </div>
      </div>

      {/* Watermark */}
      {watermark && (
        <span className="absolute bottom-4 right-4 text-xs text-gray-200 select-none pointer-events-none">
          {watermark}
        </span>
      )}
    </div>
  );
}
