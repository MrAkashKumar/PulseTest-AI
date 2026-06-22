import "./globals.css";

export const metadata = {
  title: "PulseTest-AI — NEET PG Clinical Intelligence",
  description: "Adaptive, evidence-grounded NEET PG and INI-CET clinical reasoning practice"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
