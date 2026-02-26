export const statusClass = (status: string) => {
  const s = status?.toLowerCase();
  switch (s) {
    case "pending":
      return "bg-[#f2f2e4] text-[#988458]";
    case "completed":
    case "paid":
      return "bg-[#e5f5f2] text-[#50a08e]";
    case "cancelled":
      return "bg-[#ffd4e3] text-[#8e4d63]";
    default:
      return "bg-slate-600 text-white";
  }
};
export const timeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, value] of Object.entries(intervals)) {
    const interval = seconds / value;
    if (interval >= 1) {
      const rounded = Math.floor(interval);
      return `${rounded} ${unit}${rounded !== 1 ? "s" : ""} ago`;
    }
  }

  return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
};
