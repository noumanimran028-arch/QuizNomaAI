
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

  // "Generate 200 MCQs on JavaScript" se target count nikalta hai.
  function getRequestedTotal(source) {
    const match = source.match(
      /\b(?:generate|create|make|prepare|give me)\s+(\d+)\s+(?:mcqs?|multiple[\s-]?choice questions?)\b/i
    );

    if (!match) return null;

    const count = Number(match[1]);

    return Number.isSafeInteger(count) && count > 0
      ? count
      : null;
  }

  const SYSTEM_PROMPT = `
You are an intelligent MCQ processor and generator.

The user provides source text, previously processed questions,
and sometimes a requested total number of MCQs.

TASK:
Return the next batch of new MCQs as valid JSON.

RULES:
1. If the source contains existing MCQs, preserve their original
   wording, options, answers, and order as much as possible.
2. If the source contains notes or educational information,
   generate relevant MCQs based on that information.
3. Do not repeat any question in previouslyProcessedQuestions.
4. Every generated MCQ must have four options labelled A, B, C, D.
5. The answer must be the correct option label: A, B, C, or D.
6. Return no more than batchSize MCQs.
7. If remainingRequestedCount is a positive number, do not return
   more than that number of MCQs.
8. If a requested total is provided, continue generating batches
   until that total has been reached, provided enough valid content
   can be generated from the source or topic.
9. If no requested total is provided, set hasMore to true only
   when additional useful questions remain or can reasonably be
   generated. Otherwise set it to false.
10. If no new valid questions remain, return an empty mcqs array.
11. Return JSON only. Do not include Markdown or explanations.

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

  async function getAIResponse(
    source,
    previousQuestions = [],
    requestedTotal = null
  ) {
    if (!APIKEY) {
      setErrorMessage(
        'API key load nahi hui. Vercel environment variables check karo.'
      );
      return null;
    }

    const remainingRequestedCount =
      requestedTotal === null
        ? null
        : Math.max(0, requestedTotal - previousQuestions.length);

    if (remainingRequestedCount === 0) {
      return { mcqs: [], hasMore: false };
    }

    const requestBatchSize =
      remainingRequestedCount === null
        ? BATCH_SIZE
        : Math.min(BATCH_SIZE, remainingRequestedCount);

    const requestData = {
      sourceText: source,
      previouslyProcessedQuestions: previousQuestions,
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
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
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
          body: JSON.stringify(requestBody)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error(
          'Groq API error:',
          result.error?.message || response.status
        );

        if (response.status === 429) {
          setErrorMessage(
            'API request limit reach ho gayi hai. Thori dair baad dobara try karo.'
          );
        } else if (response.status >= 500) {
          setErrorMessage(
            'AI service filhal busy hai. Kuch dair baad try karo.'
          );
        } else {
          setErrorMessage(
            result.error?.message ||
              `API request failed: ${response.status}`
          );
        }

        return null;
      }

      const choice = result.choices?.[0];
      const reply = choice?.message?.content;

      console.log('AI finish reason:', choice?.finish_reason);

      if (
        !choice ||
        !reply ||
        choice.finish_reason === 'length'
      ) {
        setErrorMessage(
          'AI response incomplete hai. Dobara try karo.'
        );
        return null;
      }

      let data;

      try {
        data = JSON.parse(reply);
      } catch {
        console.error('Invalid JSON from AI:', reply);
        setErrorMessage(
          'AI ka response valid JSON nahi tha. Dobara try karo.'
        );
        return null;
      }

      if (!data || !Array.isArray(data.mcqs)) {
        setErrorMessage(
          'AI response ka format valid nahi hai.'
        );
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

        const labels = item.options.map(
          (option) => option?.label
        );

        const validOptions = item.options.every(
          (option) =>
            typeof option?.label === 'string' &&
            typeof option?.text === 'string' &&
            option.text.trim() !== ''
        );

        return (
          validOptions &&
          ['A', 'B', 'C', 'D'].every((label) =>
            labels.includes(label)
          ) &&
          ['A', 'B', 'C', 'D'].includes(item.answer)
        );
      });

      const uniqueInBatch = [];
      const batchQuestions = new Set();

      for (const item of validMcqs) {
        const key = item.question.trim().toLowerCase();

        if (!batchQuestions.has(key)) {
          batchQuestions.add(key);
          uniqueInBatch.push(item);
        }
      }

      const limitedMcqs = uniqueInBatch.slice(
        0,
        requestBatchSize
      );

      console.log('AI hasMore:', data.hasMore);
      console.log('Valid MCQs:', limitedMcqs.length);

      if (limitedMcqs.length === 0) {
        setErrorMessage(
          'AI ne koi naya valid MCQ nahi diya.'
        );

        return {
          mcqs: [],
          hasMore: false
        };
      }

      // Explicit requested count ko AI ke hasMore se zyada priority do.
      const nextHasMore =
        requestedTotal !== null
          ? previousQuestions.length + limitedMcqs.length <
            requestedTotal
          : data.hasMore === true;

      setErrorMessage('');

      return {
        mcqs: limitedMcqs,
        hasMore: nextHasMore
      };
    } catch (error) {
      console.error('AI processing error:', error);

      setErrorMessage(
        'Network ya response processing error hua. Dobara try karo.'
      );

      return null;
    }
  }

  async function handleGenerate() {
    const source = ref1.current?.value.trim();

    if (!source) {
      setErrorMessage('Pehle apna text ya MCQ topic enter karo.');
      return;
    }

    if (isLoading) return;

    const requestedTotal = getRequestedTotal(source);

    setSourceText(source);
    setTargetTotal(requestedTotal);
    setMcqs([]);
    setHasMore(true);
    setShowQuiz(false);
    setErrorMessage('');
    setIsLoading(true);

    try {
      const result = await getAIResponse(
        source,
        [],
        requestedTotal
      );

      if (!result) return;

      if (result.mcqs.length === 0) {
        setErrorMessage(
          'Is input se koi valid MCQ nahi mila. Apna text ya topic check karo.'
        );
        return;
      }

      setMcqs(result.mcqs);
      setHasMore(result.hasMore);
      setShowQuiz(true);
    } catch (error) {
      console.error('Generate quiz error:', error);
      setErrorMessage('Quiz generate nahi hua. Dobara try karo.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNextBatch() {
    if (isLoading || !hasMore || Mcqs.length === 0) {
      console.log('Next batch blocked:', {
        isLoading,
        hasMore,
        loadedQuestions: Mcqs.length
      });

      return 0;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const previousQuestions = Mcqs.map(
        (item) => item.question
      );

      console.log(
        'Requesting next batch. Already loaded:',
        previousQuestions.length
      );

      const result = await getAIResponse(
        sourceText,
        previousQuestions,
        targetTotal
      );

      if (!result) return 0;

      const previousSet = new Set(
        previousQuestions.map((question) =>
          question.trim().toLowerCase()
        )
      );

      const newMcqs = result.mcqs.filter(
        (item) =>
          !previousSet.has(
            item.question.trim().toLowerCase()
          )
      );

      console.log('New unique MCQs:', newMcqs.length);

      if (newMcqs.length === 0) {
        setHasMore(false);
        setErrorMessage(
          'Mazeed unique MCQs nahi milay. Available questions complete hain.'
        );
        return 0;
      }

      const updatedTotal =
        previousQuestions.length + newMcqs.length;

      setMcqs((previous) => [...previous, ...newMcqs]);

      setHasMore(
        targetTotal !== null
          ? updatedTotal < targetTotal
          : result.hasMore
      );

      return newMcqs.length;
    } catch (error) {
      console.error('Next batch error:', error);
      setErrorMessage(
        'Next batch load nahi hua. Dobara try karo.'
      );
      return 0;
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
            <h2>Paste your text or enter a topic</h2>

            <textarea
              ref={ref1}
              placeholder="Paste your MCQs/notes, or enter: Generate 200 MCQs on JavaScript"
              disabled={isLoading}
            />

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
