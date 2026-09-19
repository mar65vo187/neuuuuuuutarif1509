import { useState } from 'react';

export default function FreeCheckForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', zip: '' });

  const next = () => setStep(step + 1);
  const prev = () => setStep(step - 1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hier würde ein API‑Call zu OpenAI‑Chat‑Bot oder zu einem Backend‑Endpoint erfolgen.
    alert('Danke! Wir prüfen Ihren Tarif und melden uns innerhalb von 24 h.');
    setStep(1);
    setForm({ name: '', email: '', zip: '' });
  };

  return (
    <form className="bg-gray-100 p-6 rounded shadow-md" onSubmit={handleSubmit}>
      {step === 1 && (
        <>
          <h2 className="text-2xl font-bold mb-4">Ihre Daten</h2>
          <label className="block mb-2">
            Name
            <input type="text" name="name" value={form.name} onChange={handleChange} required className="w-full border rounded p-2" />
          </label>
          <label className="block mb-2">
            E‑Mail
            <input type="email" name="email" value={form.email} onChange={handleChange} required className="w-full border rounded p-2" />
          </label>
          <button type="button" onClick={next} className="mt-4 bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark">Weiter</button>
        </>
      )}
      {step === 2 && (
        <>
          <h2 className="text-2xl font-bold mb-4">Wo wohnen Sie?</h2>
          <label className="block mb-2">
            Postleitzahl
            <input type="text" name="zip" value={form.zip} onChange={handleChange} required pattern="\d{5}" className="w-full border rounded p-2" />
          </label>
          <div className="flex justify-between mt-4">
            <button type="button" onClick={prev} className="underline text-gray-600">Zurück</button>
            <button type="submit" className="bg-primary text-white py-2 px-4 rounded hover:bg-primary-dark">Tarif‑Check anfordern</button>
          </div>
        </>
      )}
    </form>
  );
}
