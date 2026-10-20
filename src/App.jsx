
import './App.css';
import { useState, useRef } from 'react';
import Quiz from './Quiz.jsx';
import LandingDashboard from './LandingDashboard';

const BATCH_SIZE = 10;

const SYSTEM_PROMPT = `
You are an intelligent MCQ converter and generator.

TASK:
1. If the input already contains MCQs, convert them into JSON.
2. Preserve the original questions, available options, and answers.
3. Do not invent missing options or answers.
4. If an answer is missing or unknown, use an empty string.
5. If the input contains educational notes instead of MCQs,
   generate useful MCQs based only on the supplied information.
6. For newly generated MCQs, provide four distinct options
   labelled A, B, C, and D, with exactly one correct answer.
7. Do not create duplicate questions.
8. Process ALL MCQs in the current input batch.
9. Do not skip questions or stop before the end of the batch.

REQUIRED OUTPUT:
Return only valid JSON in this exact structure:

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

Return no Markdown, code fences, or explanations.
Use double quotes and valid JSON syntax.
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

  // Numbered MCQs ko identify karke 10-10 ke batches banao.
  function splitIntoBatches(text) {
    const questionStart =
      /^\s*(?:(?:question|q)\s*)?\d+\s*[.)\-:]\s*|^\s*(?:question|q)\s*\d+\s*[.)\-:]\s*/gim;

    const matches = [...text.matchAll(questionStart)];

    // Agar numbered questions nahi milte, input ko
    // andazay se cut na karo; ek request mein bhejo.
    if (matches.length < 2) {
      return [text.trim()];
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

  // Groq ki ek API request bhejo aur JSON return lo.
  async function getAIResponse(value, batchNumber) {
    if (!APIKEY) {
      throw new Error(
        'API key nahi mili. VITE_GROQ_API_KEY check karo.'
      );
    }

    console.log(`Sending API request for batch ${batchNumber}`);

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
              content:
                `Convert ALL MCQs in batch ${batchNumber} ` +
                `into the required JSON format.\n\n${value}`,
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
      throw new Error(`Batch ${batchNumber}: empty AI response.`);
    }

    console.log(
      `Batch ${batchNumber} finish reason:`,
      choice.finish_reason
    );

    console.log('Token usage:', result.usage);

    // Truncated response ko successful batch na samjho.
    if (choice.finish_reason === 'length') {
      throw new Error(
        `Batch ${batchNumber} ka response incomplete hai.`
      );
    }

    const reply = choice.message.content.trim();

    let data;

    try {
      // Pehle direct JSON parse karo.
      data = JSON.parse(reply);
    } catch {
      // Agar response code fences mein ho, unhein hatao.
      const cleaned = reply
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      try {
        data = JSON.parse(cleaned);
      } catch {
        throw new Error(
          `Batch ${batchNumber}: invalid JSON response.`
        );
      }
    }

    if (!data || !Array.isArray(data.mcqs)) {
      throw new Error(
        `Batch ${batchNumber}: mcqs array missing hai.`
      );
    }

    // Har question ka basic structure validate karo.
    for (const mcq of data.mcqs) {
      if (
        !mcq ||
        typeof mcq.question !== 'string' ||
        !Array.isArray(mcq.options) ||
        typeof mcq.answer !== 'string'
      ) {
        throw new Error(
          `Batch ${batchNumber}: MCQ ka JSON structure invalid hai.`
        );
      }
    }

    console.log(
      `Batch ${batchNumber} received ${data.mcqs.length} MCQs.`
    );

    return data.mcqs;
  }

  // Saare batches ko sequentially process karo.
  async function Chat() {
    const text = ref1.current?.value?.trim();

    if (!text) {
      throw new Error('Please enter MCQs first.');
    }

    const batches = splitIntoBatches(text);
    const allMcqs = [];

    console.log('Total batches:', batches.length);
    console.log('Batch size:', BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      setProgress(
        `Processing batch ${i + 1} of ${batches.length}...`
      );

      // Agli request tabhi chalegi jab current request complete ho.
      const batchMcqs = await getAIResponse(
        batches[i],
        i + 1
      );

      allMcqs.push(...batchMcqs);

      console.log(
        `Completed batch ${i + 1}. Total collected: ${allMcqs.length}`
      );
    }

    if (allMcqs.length === 0) {
      throw new Error('Koi MCQs return nahi hue.');
    }

    // Saare batches complete hone par combined quiz save karo.
    setMcqs(allMcqs);

    return allMcqs;
  }

  async function handleGenerate() {
    if (isGenerating.current) return;

    if (!ref1.current?.value?.trim()) {
      alert('Please enter MCQs or educational text first.');
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
      console.error('Generation error:', error.message);
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
              placeholder="Paste your MCQs here..."
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
