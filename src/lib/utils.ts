import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDeadline(date: Date | null): string {
  if (!date) return "No deadline";
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return "Expired";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days} days left`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    INTERNSHIP: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    PLACEMENT: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    INTERVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    HACKATHON: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    COMPETITION: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    SCHOLARSHIP: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    EVENT: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  return colors[category] || colors.OTHER;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    HIGH: "text-red-600 dark:text-red-400",
    MEDIUM: "text-yellow-600 dark:text-yellow-400",
    LOW: "text-green-600 dark:text-green-400",
  };
  return colors[priority] || colors.MEDIUM;
}
