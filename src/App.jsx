
import './App.css';
import { useState, useRef } from 'react';
import Quiz from './Quiz.jsx';
import LandingDashboard from './LandingDashboard';

const BATCH_SIZE = 10;

const SYSTEM_PROMPT = `
You are an intelligent MCQ converter and generator.

If the input already contains MCQs:
- Preserve every original question and its available options.
- Preserve the correct answer when it is provided.
- Do not create extra questions.
- If an answer is missing or unknown, use "" for answer.
- Do not invent missing options.

If the input contains educational notes instead of MCQs:
- Generate useful MCQs based only on the provided information.
- Each MCQ should have four distinct options labelled A, B, C, D.
- Set answer to the correct option label.
- Avoid duplicate questions.

Return ONLY valid JSON in this format:
{
  "mcqs": [
    {
      "question": "Question text",
      "options": [
        { "label": "A", "text": "Option 1" },
        { "label": "B", "text": "Option 2" },
        { "label": "C", "text": "Option 3" },
        { "label": "D", "text": "Option 4" }
      ],
      "answer": "A"
    }
  ]
}

No Markdown or explanations.
`;

function App() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [Mcqs, setMcqs] = useState([]);
  const [Generate, setGenerate] = useState(false);
  const [progress, setProgress] = useState('');
  const ref1 = useRef(null);
  const isGenerating = useRef(false);

  const APIKEY = import.meta.env.VITE_GROQ_API_KEY;

  // Input mein maujood numbered MCQs ko identify karo.
  function splitIntoBatches(text) {
    const questionPattern =
      /^\s*(?:(?:Q(?:uestion)?\s*)?\d+\s*[.)]|\d+\s*[-:])\s+/gm;

    const matches = [...text.matchAll(questionPattern)];

    // Agar numbered MCQs identify na hon, poora text
    // ek request mein bhejo; text ko ghalat tareeqe se na kaato.
    if (matches.length < 2) {
      return [text];
    }

    const questions = [];

    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end =
        i + 1 < matches.length
          ? matches[i + 1].index
          : text.length;

      const question = text.slice(start, end).trim();

      if (question) {
        questions.push(question);
      }
    }

    const batches = [];

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(
        questions.slice(i, i + BATCH_SIZE).join('\n\n')
      );
    }

    return batches;
  }

  async function getAIResponse(value) {
    if (!APIKEY) {
      throw new Error(
        'Groq API key nahi mili. Apni .env file check karo.'
      );
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${APIKEY}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          max_completion_tokens: 8192,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: value,
            },
          ],
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error?.message || 'Groq API request failed.'
      );
    }

    const choice = result.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error('AI ne empty response diya.');
    }

    if (choice.finish_reason === 'length') {
      throw new Error(
        'AI response incomplete hai. Is batch ka output truncate ho gaya.'
      );
    }

    const reply = choice.message.content.trim();

    let data;

    try {
      // Normal JSON parse ki koshish karo.
      data = JSON.parse(reply);
    } catch {
      // Agar AI ne JSON ke gird extra text diya ho,
      // to JSON object extract karne ki koshish karo.
      const start = reply.indexOf('{');
      const end = reply.lastIndexOf('}');

      if (start === -1 || end <= start) {
        throw new Error('AI ka response valid JSON nahi hai.');
      }

      data = JSON.parse(reply.slice(start, end + 1));
    }

    if (!data || !Array.isArray(data.mcqs)) {
      throw new Error('AI response mein mcqs array nahi hai.');
    }

    return data.mcqs;
  }

  async function Chat() {
    const text = ref1.current?.value?.trim();

    if (!text) {
      throw new Error('Please enter MCQs or educational text first.');
    }

    const batches = splitIntoBatches(text);
    const allMcqs = [];

    console.log('Total batches:', batches.length);

    // Har batch ko sequentially process karo.
    for (let i = 0; i < batches.length; i++) {
      setProgress(
        `Processing batch ${i + 1} of ${batches.length}...`
      );

      console.log(`Processing batch ${i + 1}/${batches.length}`);

      const newMcqs = await getAIResponse(batches[i]);

      // Batch ke MCQs ko combined result mein add karo.
      allMcqs.push(...newMcqs);

      console.log(
        `Batch ${i + 1} complete. MCQs received:`,
        newMcqs.length
      );
    }

    if (allMcqs.length === 0) {
      throw new Error('Koi MCQs generate ya convert nahi hue.');
    }

    // Quiz ko tamam batches ke baad update karo.
    setMcqs(allMcqs);

    return allMcqs;
  }

  async function handleGenerate() {
    if (isGenerating.current) return;

    if (!ref1.current?.value?.trim()) {
      console.log('Please enter MCQs first.');
      return;
    }

    isGenerating.current = true;
    setGenerate(true);
    setShowQuiz(false);
    setMcqs([]);
    setProgress('');

    try {
      const allMcqs = await Chat();

      if (allMcqs.length > 0) {
        setShowQuiz(true);
      }
    } catch (error) {
      console.error('Quiz generation error:', error.message);
      alert(error.message);
    } finally {
      isGenerating.current = false;
      setGenerate(false);
      setProgress('');
    }
  }

  if (showLanding) {
    return (
      <LandingDashboard
        onGetStarted={() => setShowLanding(false)}
      />
    );
  }

  return (
    <div>
      {!showQuiz && (
        <div>
          <nav className="Nav">
            <h3>Take-to-Quiz</h3>
            <h5>Dashboard</h5>
          </nav>

          <div className="Text-Area">
            <h2>Paste your text</h2>

            <textarea
              ref={ref1}
              placeholder="Paste your MCQs or educational text here..."
              disabled={Generate}
            />

            <button
              onClick={handleGenerate}
              disabled={Generate}
            >
              {Generate ? 'Generating...' : 'Generate Quiz'}
            </button>

            {Generate && <p>{progress}</p>}
          </div>
        </div>
      )}

      {showQuiz && (
        <div className="Full-Quiz-Container">
          <Quiz Mcqs={Mcqs} />
        </div>
      )}
    </div>
  );
}

export default App;
