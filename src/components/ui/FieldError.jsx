export default function FieldError({ message, className = "" }) {
  if (!message) return null;
  return <span className={`mt-1 block text-xs font-medium text-red-600 ${className}`} role="alert">{message}</span>;
}
