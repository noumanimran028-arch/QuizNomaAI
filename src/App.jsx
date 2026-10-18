
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
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const ref1 = useRef(null);

  const APIKEY = import.meta.env.VITE_GROQ_API_KEY;

  const SYSTEM_PROMPT = `
You are an intelligent MCQ processor and generator.

The user will provide source text and previously processed questions.

YOUR TASK:
Return the NEXT batch of at most ${BATCH_SIZE} new MCQs.

RULES:

1. Identify whether the source already contains MCQs or
   contains notes, paragraphs, or educational information.

2. If the source contains existing MCQs:
   - Preserve the original question, options, and answer.
   - Process questions in their original order.
   - Do not rewrite existing questions unnecessarily.
   - Do not invent missing answers.
   - Skip all questions listed as previously processed.

3. If the source contains notes or general information:
   - Generate relevant MCQs based on the source.
   - Generate new questions different from previously processed ones.
   - Use four options labelled A, B, C, and D.
   - Set answer to the correct option label.
   - Do not introduce unsupported facts.

4. Return no more than ${BATCH_SIZE} new MCQs.
   Return fewer if fewer valid questions remain.
   Never return questions already processed.

5. Return valid JSON only, using this structure:

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

6. hasMore must be true only when additional useful questions
   remain in the source or can reasonably be generated.
   Otherwise, return false.

7. If no new questions remain, return:
   {"mcqs": [], "hasMore": false}

8. Return complete questions only. Never return incomplete JSON.
`;

  async function getAIResponse(source, previousQuestions = []) {
    if (!APIKEY) {
      setErrorMessage(
        'API key load nahi hui. Environment variable check karo.'
      );
      return null;
    }

    const requestData = {
      sourceText: source,
      previouslyProcessedQuestions: previousQuestions,
      batchSize: BATCH_SIZE,
      instruction:
        previousQuestions.length === 0
          ? 'Generate or process the first batch.'
          : 'Continue from where the previous batch ended.'
    };

    const Data = {
      model: 'openai/gpt-oss-20b',
      max_completion_tokens: 8192,
      reasoning_effort: 'low',
      response_format: {
        type: 'json_object'
      },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: JSON.stringify(requestData)
        }
      ]
    };

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${APIKEY}`
          },
          body: JSON.stringify(Data)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        const message =
          result.error?.message || 'API request failed.';

        setErrorMessage(message);
        console.error('API Error:', message);
        return null;
      }

      const choice = result.choices?.[0];
      const reply = choice?.message?.content;

      if (!choice || !reply || choice.finish_reason === 'length') {
        setErrorMessage(
          'AI response incomplete hai. Dobara try karo.'
        );
        return null;
      }

      const data = JSON.parse(reply);
      console.log('AI hasMore:', data.hasMore);
console.log('Received MCQs:', data.mcqs?.length);
      if (!data || !Array.isArray(data.mcqs)) {
        setErrorMessage('AI response ka format valid nahi hai.');
        return null;
      }

      // Validate and normalize each MCQ before displaying it.
      const validMcqs = data.mcqs.filter((item) => {
        return (
          typeof item.question === 'string' &&
          item.question.trim() !== '' &&
          Array.isArray(item.options) &&
          item.options.length > 0 &&
          item.options.every(
            (option) =>
              typeof option.label === 'string' &&
              typeof option.text === 'string'
          ) &&
          typeof item.answer === 'string'
        );
      });

      if (validMcqs.length > BATCH_SIZE) {
        validMcqs.length = BATCH_SIZE;
      }

      if (validMcqs.length === 0) {
        setErrorMessage('');
        return {
          mcqs: [],
          hasMore: false
        };
      }

      setErrorMessage('');

      return {
  mcqs: validMcqs,
  hasMore: data.hasMore !== false
};
    } catch (error) {
      console.error('AI processing error:', error.message);

      setErrorMessage(
        'Response process nahi ho saka. JSON ya network error check karo.'
      );

      return null;
    }
  }

  async function handleGenerate() {
    const source = ref1.current?.value.trim();

    if (!source) {
      setErrorMessage('Pehle apna text paste karo.');
      return;
    }

    setSourceText(source);
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await getAIResponse(source);

      if (result && result.mcqs.length > 0) {
        setMcqs(result.mcqs);
        setHasMore(result.hasMore);
        setShowQuiz(true);
      } else if (result) {
        setErrorMessage('Is text se koi valid MCQs nahi milay.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNextBatch() {
    if (isLoading || !hasMore) {
      return 0;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const previousQuestions = Mcqs.map(
        (item) => item.question
      );

      const result = await getAIResponse(
        sourceText,
        previousQuestions
      );

      if (!result) {
        return 0;
      }

      const previousSet = new Set(
        previousQuestions.map((question) =>
          question.trim().toLowerCase()
        )
      );

      const newMcqs = result.mcqs.filter(
        (item) =>
          !previousSet.has(item.question.trim().toLowerCase())
      );

      if (newMcqs.length === 0) {
        setHasMore(false);
        setErrorMessage(
          'Mazeed unique MCQs nahi milay. Available questions complete hain.'
        );
        return 0;
      }

      // Append new MCQs instead of replacing previous batches.
      setMcqs((previous) => [...previous, ...newMcqs]);
      setHasMore(result.hasMore);

      return newMcqs.length;
    } finally {
      setIsLoading(false);
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
        <>
          <nav className="Nav">
            <h3>QuizNomaAI</h3>
            <h5>Dashboard</h5>
          </nav>

          <div className="Text-Area">
            <h2>Paste your text</h2>

            <textarea ref={ref1} />

            <button
              onClick={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? 'Generating...' : 'Generate Quiz'}
            </button>

            {errorMessage && <p>{errorMessage}</p>}
          </div>
        </>
      )}

      {showQuiz && (
        <div className="Full-Quiz-Container">
          <Quiz
            Mcqs={Mcqs}
            onNextBatch={handleNextBatch}
            isLoading={isLoading}
            hasMore={hasMore}
            errorMessage={errorMessage}
          />
        </div>
      )}
    </div>
  );
}

export default App;
