export default function IntegrationIcon({ id }: { id: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", "aria-hidden": true as const };
  switch (id) {
    case "notion":
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="4" fill="#111"/><path d="M8 7.5h2.2l3.6 6.2V7.5H16V16.5h-2.2L10.2 10.2v6.3H8V7.5Z" fill="#fff"/></svg>;
    case "confluence":
      return <svg {...common}><path d="M5 16.5c2.2-1.2 4.4-1.2 6.6 0l1.2-2.2C10.2 12.6 7.4 12.6 4.6 14.4L5 16.5Z" fill="#2684FF"/><path d="M19 7.5c-2.2 1.2-4.4 1.2-6.6 0L11.2 9.7c2.6 1.7 5.4 1.7 8.2-.1L19 7.5Z" fill="#2684FF"/></svg>;
    case "sharepoint":
      return <svg {...common}><circle cx="12" cy="12" r="9" fill="#038387"/><circle cx="9" cy="10" r="1.3" fill="#fff"/><circle cx="15" cy="10" r="1.3" fill="#fff"/><circle cx="12" cy="15" r="1.3" fill="#fff"/><path d="M9 10.2 12 14.6 15 10.2" fill="none" stroke="#fff" strokeWidth="1.2"/></svg>;
    case "jira":
      return <svg {...common}><path d="M12.6 3.2 4.2 11.4a2.2 2.2 0 0 0 0 3.1l5.3 5.2 3.1-3.1-4.2-4.1 4.2-4.1 3.1-3.1-3.1-2.1Z" fill="#2684FF"/><path d="M12.6 8.4 9.5 11.5l3.1 3.1 5.2-5.1a2.2 2.2 0 0 0 0-3.1L12.6 8.4Z" fill="#2684FF" opacity=".7"/></svg>;
    case "drive":
      return <svg {...common}><path d="M8.2 4.5h7.6L20 12.2l-3.8 6.3H7.8L4 12.2 8.2 4.5Z" fill="#FFBA00"/><path d="M8.2 4.5 4 12.2h6.2L8.2 4.5Z" fill="#1FA463"/><path d="M15.8 4.5 20 12.2h-6.2l2-7.7Z" fill="#4285F4"/><path d="M7.8 18.5h8.4L12.2 12.2 7.8 18.5Z" fill="#fff" opacity=".9"/></svg>;
    case "slack":
      return <svg {...common}><path d="M9.2 14.6a1.6 1.6 0 1 1-1.6-1.6h1.6v1.6Z" fill="#E01E5A"/><path d="M10 14.6a1.6 1.6 0 1 1 3.2 0v4a1.6 1.6 0 1 1-3.2 0v-4Z" fill="#E01E5A"/><path d="M14.8 9.2a1.6 1.6 0 1 1 1.6-1.6v1.6h-1.6Z" fill="#36C5F0"/><path d="M14.8 10a1.6 1.6 0 1 1 0 3.2h-4a1.6 1.6 0 1 1 0-3.2h4Z" fill="#36C5F0"/><path d="M9.2 9.4A1.6 1.6 0 1 1 7.6 11H9.2V9.4Z" fill="#2EB67D"/><path d="M9.2 8.6a1.6 1.6 0 1 1 3.2 0v4a1.6 1.6 0 1 1-3.2 0v-4Z" fill="#2EB67D"/><path d="M14.8 14.8a1.6 1.6 0 1 1-1.6 1.6v-1.6h1.6Z" fill="#ECB22E"/><path d="M14.8 14a1.6 1.6 0 1 1 0-3.2h4a1.6 1.6 0 1 1 0 3.2h-4Z" fill="#ECB22E"/></svg>;
    case "email":
      return <svg {...common} fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#EA4335" strokeWidth="1.8"/><path d="m4 7 8 6 8-6" stroke="#EA4335" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
    case "mcp":
      return <svg {...common} fill="none" stroke="#334155" strokeWidth="1.8"><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="7" r="2.2"/><circle cx="18" cy="17" r="2.2"/><path d="M8.2 12h5.2M13.4 12 16 8.4M13.4 12 16 15.6"/></svg>;
    case "public":
      return <svg {...common} fill="none" stroke="#15803d" strokeWidth="1.8"><circle cx="11" cy="11" r="6"/><path d="m15.5 15.5 4 4" strokeLinecap="round"/></svg>;
    default:
      return <svg {...common} fill="none" stroke="#4f46e5" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3.5 13.4 8l4.6.4-3.5 3 1.1 4.5L12 13.6 8.4 15.9 9.5 11.4 6 8.4 10.6 8 12 3.5Z"/></svg>;
  }
}
