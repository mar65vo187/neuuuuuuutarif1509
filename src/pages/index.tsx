import Head from 'next/head';
import Image from 'next/image';
import FreeCheckForm from '@/components/FreeCheckForm';

export default function Home() {
  return (
    <>
      <Head>
        <title>TarifWerk – Persönliche Energie‑ & Versicherungs‑Beratung</title>
        <meta name="description" content="Kostenlose, unverbindliche Tarif‑Analyse für Strom, Gas, Internet, Versicherungen und mehr. Jetzt prüfen und sparen!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="bg-primary-light text-white py-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Persönliche Beratung auf Augenhöhe</h1>
        <p className="text-lg mb-6">Wir vergleichen über 10 000 Tarife – kostenlos und unverbindlich.</p>
        <a href="#check" className="bg-white text-primary font-semibold py-2 px-6 rounded hover:bg-gray-100">Jetzt kostenlosen Tarif‑Check starten</a>
      </header>
      <main className="max-w-4xl mx-auto p-6" id="check">
        <FreeCheckForm />
      </main>
      <footer className="bg-gray-800 text-gray-200 py-8 text-center">
        <p>© 2026 TarifWerk – Beratung für Tarife, Energie &amp; Versicherungen</p>
      </footer>
    </>
  );
}
