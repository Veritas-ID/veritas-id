import { VeritasRecord } from "@/lib/supabase";

interface MetadataTableProps {
  record: VeritasRecord;
}

export function MetadataTable({ record }: MetadataTableProps) {
  const formattedDate = new Date(record.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const rows = [
    { label: "Veritas ID", value: record.id, mono: true },
    { label: "Indicator", value: record.indicator_label },
    { label: "Country", value: record.country_name },
    { label: "Period", value: `${record.year_start} – ${record.year_end}` },
    { label: "Source", value: "World Bank Data360" },
    { label: "Generated", value: formattedDate },
    { label: "Hash", value: `${record.hash.slice(0, 16)}...`, mono: true },
  ];

  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {rows.map(({ label, value, mono }) => (
          <tr key={label} className="border-b border-gray-100 last:border-0">
            <td className="py-2 pr-6 text-gray-400 font-medium whitespace-nowrap w-32">
              {label}
            </td>
            <td
              className={`py-2 text-gray-800 break-all ${
                mono ? "font-mono text-xs" : ""
              }`}
            >
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
