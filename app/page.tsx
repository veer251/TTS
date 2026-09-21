import TTSForm from "@/components/TTSForm";

export default function Home() {
  return (
    <main className="container">
      <header className="header">
        <h1>TTS Platform</h1>
        <p>Turn text into natural speech with Microsoft Edge voices.</p>
      </header>
      <TTSForm />
    </main>
  );
}
