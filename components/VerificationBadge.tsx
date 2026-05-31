type BadgeStatus = "verified" | "tampered" | "not-found";

interface VerificationBadgeProps {
  status: BadgeStatus;
}

export function VerificationBadge({ status }: VerificationBadgeProps) {
  if (status === "verified") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
        <span className="text-7xl mb-6">✅</span>
        <h1
          className="text-4xl font-bold mb-3"
          style={{ color: "#0057B8" }}
        >
          Verified
        </h1>
        <p className="text-lg text-gray-600">
          This data is authentic and unmodified
        </p>
      </div>
    );
  }

  if (status === "tampered") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
        <span className="text-7xl mb-6">⚠️</span>
        <h1
          className="text-4xl font-bold mb-3"
          style={{ color: "#DC2626" }}
        >
          Modified — Cannot Verify
        </h1>
        <p className="text-lg text-gray-600">
          The data in this chart has been modified
        </p>
      </div>
    );
  }

  // not-found
  return (
    <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
      <span className="text-7xl mb-6">⚠️</span>
      <h1
        className="text-4xl font-bold mb-3"
        style={{ color: "#DC2626" }}
      >
        Cannot Verify
      </h1>
      <p className="text-lg text-gray-600">
        No record found for this Veritas ID
      </p>
    </div>
  );
}
