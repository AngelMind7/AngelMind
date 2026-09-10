import { useLocale } from "@/contexts/LocaleContext";

export function LocalizedDate({ value }: { value: Date | string | number }) {
  const { formatDate } = useLocale();
  return <>{formatDate(value)}</>;
}
