import "./kassa.css";

export default function KassaRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="kassa-root h-dvh overflow-hidden">{children}</div>;
}
