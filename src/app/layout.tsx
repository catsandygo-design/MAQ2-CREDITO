import './globals.css';

export const metadata = {
  title: 'MAQ2 Credito',
  description: 'Sistema de analise e acompanhamento de credito.',
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{props.children}</body>
    </html>
  );
}
