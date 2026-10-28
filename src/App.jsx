import './App.css';
import { useRef, useState } from 'react';
import Quiz from './Quiz.jsx';
import LandingDashboard from './LandingDashboard';

const BATCH_SIZE = 10;

function App() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [Mcqs, setMcqs] = useState([]);
  const [sourceText, setSourceText] = useState('');
  const [targetTotal, setTargetTotal] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const ref1 = useRef(null);
  const APIKEY = import.meta.env.VITE_GROQ_API_KEY;

  // Extracts requested count from prompt string
  function getRequestedTotal(source) {
    const match = source.match(
      /\b(?:generate|create|make|prepare|give me)\s+(\d+)\s+(?:mcqs?|multiple[\s-]?choice questions?)\b/i
    );
    if (!match) return null;
    const count = Number(match[1]);
    return Number.isSafeInteger(count) && count > 0 ? count : null;
  }

  const SYSTEM_PROMPT = `
You are an intelligent MCQ processor and generator.
The user provides source text, previously processed question strings, and a requested total.

TASK:
Return the next batch of new MCQs as valid JSON.

RULES:
1. If the source contains notes or educational information, generate relevant MCQs based on that.
2. CRITICAL: Do not repeat or duplicate any question title mentioned in previouslyProcessedQuestions.
3. Every generated MCQ must have four options labelled A, B, C, D.
4. The answer must match the correct option label exactly: A, B, C, or D.
5. Return no more than batchSize MCQs.
6. Return JSON only. Do not include Markdown wrapping or structural explanations.

Required JSON structure:
{
  "mcqs": [
    {
      "question": "Question text",
      "options": [
        {"label": "A", "text": "Option A"},
        {"label": "B", "text": "Option B"},
        {"label": "C", "text": "Option C"},
        {"label": "D", "text": "Option D"}
      ],
      "answer": "A"
    }
  ],
  "hasMore": true
}
`;

  async function getAIResponse(source, previousQuestions = [], requestedTotal = null) {
    if (!APIKEY) {
      setErrorMessage('API key load nahi hui. Vercel environment variables check karo.');
      return null;
    }

    const remainingRequestedCount =
      requestedTotal === null
        ? null
        : Math.max(0, requestedTotal - previousQuestions.length);

    if (requestedTotal !== null && remainingRequestedCount === 0) {
      return { mcqs: [], hasMore: false };
    }

    const requestBatchSize =
      remainingRequestedCount === null
        ? BATCH_SIZE
        : Math.min(BATCH_SIZE, remainingRequestedCount);

    // OPTIMIZATION: Send only titles to prevent token clogging and bleeding wallet limits
    const simplifiedPreviousTitles = previousQuestions.map(q => q.question.trim());

    const requestData = {
      sourceText: source,
      previouslyProcessedQuestions: simplifiedPreviousTitles, 
      batchSize: requestBatchSize,
      requestedTotal,
      remainingRequestedCount,
      instruction:
        previousQuestions.length === 0
          ? 'Generate or process the first batch.'
          : 'Continue from where the previous batch ended. Return only new questions.'
    };

    const requestBody = {
      model: 'openai/gpt-oss-20b',
      max_completion_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(requestData) }
      ]
    };

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${APIKEY}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setErrorMessage('API request limit reach ho gayi hai. Thori dair baad dobara try karo.');
        } else if (response.status >= 500) {
          setErrorMessage('AI service filhal busy hai. Kuch dair baad try karo.');
        } else {
          setErrorMessage(result.error?.message || `API request failed: ${response.status}`);
        }
        return null;
      }

      const choice = result.choices?.[0];
      const reply = choice?.message?.content;

      if (!choice || !reply || choice.finish_reason === 'length') {
        setErrorMessage('AI response incomplete hai. Dobara try karo.');
        return null;
      }

      let data;
      try {
        data = JSON.parse(reply);
      } catch {
        setErrorMessage('AI ka response valid JSON nahi تھا. Dobara try karo.');
        return null;
      }

      if (!data || !Array.isArray(data.mcqs)) {
        setErrorMessage('AI response ka format valid nahi hai.');
        return null;
      }

      const validMcqs = data.mcqs.filter((item) => {
        if (
          typeof item?.question !== 'string' ||
          !item.question.trim() ||
          !Array.isArray(item.options) ||
          item.options.length !== 4 ||
          typeof item.answer !== 'string'
        ) {
          return false;
        }

        const labels = item.options.map((option) => option?.label);
        const validOptions = item.options.every(
          (option) =>
            typeof option?.label === 'string' &&
            typeof option?.text === 'string' &&
            option.text.trim() !== ''
        );

        return (
          validOptions &&
          ['A', 'B', 'C', 'D'].every((label) => labels.includes(label)) &&
          ['A', 'B', 'C', 'D'].includes(item.answer)
        );
      });

      const uniqueInBatch = [];
      const batchQuestions = new Set();

      // Filter local batch duplicates
      for (const item of validMcqs) {
        const key = item.question.trim().toLowerCase();
        if (!batchQuestions.has(key)) {
          batchQuestions.add(key);
          uniqueInBatch.push(item);
        }
      }

      const limitedMcqs = uniqueInBatch.slice(0, requestBatchSize);

      if (limitedMcqs.length === 0) {
        setErrorMessage('AI ne koi naya valid MCQ nahi diya.');
        return { mcqs: [], hasMore: false };
      }

      const nextHasMore =
        requestedTotal !== null
          ? previousQuestions.length + limitedMcqs.length < requestedTotal
          : data.hasMore === true;

      setErrorMessage('');
      return { mcqs: limitedMcqs, hasMore: nextHasMore };

    } catch (error) {
      console.error('AI processing error:', error);
      setErrorMessage('Network ya response processing error hua. Dobara try karo.');
      return null;
    }
  }

  // --- COMPLETED BATCH INITIATOR LOGIC ---
  async function handleGenerate() {
    const source = ref1.current?.value.trim();
    if (!source) {
      setErrorMessage('Please enter some text or prompt to generate quiz.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    setSourceText(source);

    const totalCount = getRequestedTotal(source);
    setTargetTotal(totalCount);

    // Fetch initial first batch
    const result = await getAIResponse(source, [], totalCount);

    setIsLoading(false);

    if (result && result.mcqs.length > 0) {
      setMcqs(result.mcqs);
      setHasMore(result.hasMore);
      setShowLanding(false);
      setShowQuiz(true);
    }
  }

  // --- CONTINUOUS INCREMENTAL BATCH TRIGGER ---
  async function handleLoadNextBatch() {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setErrorMessage('');

    const result = await getAIResponse(sourceText, Mcqs, targetTotal);

    setIsLoading(false);

    if (result && result.mcqs.length > 0) {
      setMcqs((prev) => [...prev, ...result.mcqs]);
      setHasMore(result.hasMore);
    } else if (result && result.mcqs.length === 0) {
      setHasMore(false);
    }
  }

  function handleReset() {
    setMcqs([]);
    setSourceText('');
    setTargetTotal(null);
    setHasMore(true);
    setErrorMessage('');
    setShowQuiz(false);
    setShowLanding(true);
  }

  return (
    <div className="app-container">
      {showLanding && (
        <LandingDashboard 
          inputRef={ref1} 
          onGenerate={handleGenerate} 
          isLoading={isLoading} 
          errorMessage={errorMessage}
        />
      )}

      {showQuiz && (
        <Quiz 
          questions={Mcqs} 
          hasMore={hasMore} 
          onNextBatch={handleLoadNextBatch} 
          onReset={handleReset}
          isLoading={isLoading}
          targetTotal={targetTotal}
          errorMessage={errorMessage}
        />
      )}
    </div>
  );
}

export default App;
